import GmailMessage = GoogleAppsScript.Gmail.GmailMessage;
import GmailQueryBuilder from "./GmailQueryBuilder";
import Shinkan from "./Shinkan";
import SpreadSheetManipulator from "./SpreadSheetManipulator";

class ToranoanaChecklistGenerator {

    /**
     * 正規表現を実行してグループの情報を返す
     * @see https://scrapbox.io/kadoyau/JavaScript%E3%81%AE%E6%AD%A3%E8%A6%8F%E8%A1%A8%E7%8F%BE%E3%81%A7%E3%81%AF%E3%81%BE%E3%81%A3%E3%81%9F%E3%81%93%E3%81%A8
     * @param regexp
     * @param targetText
     */
    private static executeRegExp(regexp: RegExp, targetText: string): any[] {
        const matches = [];
        while (true) {
            // @see https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec
            const match = regexp.exec(targetText);
            if (match === null) {
                break;
            }
            matches.push(match);
        }
        return matches;
    }

    private spreadSheetManipulator: SpreadSheetManipulator;

    constructor() {
        // TODO: 名前変更
        const sheetName = PropertiesService.getScriptProperties().getProperty("SHEET_NAME");
        this.spreadSheetManipulator = new SpreadSheetManipulator(sheetName);
    }

    /**
     * UseCase
     */
    public saveProductsFromTranoanaPromotionMail() {
        const tranoanaGoodsReceivedMailTitle = "【株式会社　虎の穴】商品入荷のお知らせ（サークル）";
        const dateAfterQuery = GmailQueryBuilder.createDateAfterQuery(3);

        const query = [tranoanaGoodsReceivedMailTitle, dateAfterQuery].join(" ");
        const threads = GmailApp.search(query);

        threads.map((thread) => {
            const sub = thread.getMessages().map((message: GmailMessage) => {
                const plainBody = message.getPlainBody();
                // GASのDateはJSのDateではないので変換
                const date = new Date(message.getDate().toISOString());
                const shinkans = this.getShinkansFromMail(plainBody, date);
                // 既存の新刊をとってくる
                // 実行間隔を1日にすればこのループの外に出しても問題なくなる
                const existingShinkans = this.getExistingShinkans();
                // Logger.log(exsistingShinkans);
                this.saveShinkan(shinkans, existingShinkans, date);
            });
        });
    }

    /**
     * 新刊情報を保存する
     * URLが一致するものが過去にあれば追加はしない
     * @param shinkans
     * @param existingShinkans
     * @param date
     */
    private saveShinkan(shinkans: Shinkan[], existingShinkans: Shinkan[], date: Date) {
        shinkans.map((shinkan: Shinkan) => {
            // 既存のURLと一致するものは日付だけ更新
            // URLをユニークなIDとみなしている
            // もしメロンブックスなどに拡張する場合にはサークル名とタイトルのハッシュなどにIDを変更する必要がある
            const updated = this.updateIfExists(existingShinkans, shinkan);
            if (updated) {
                return;
            }
            // それ以外は新しいので追加
            this.spreadSheetManipulator.addShinkan(shinkan, date);
        });
    }

    private updateIfExists(exsistingShinkans: Shinkan[], shinkan: Shinkan): boolean {
        let updated = false;
        exsistingShinkans.some((exsistingShinkan) => {
            if (exsistingShinkan.url === shinkan.url) {
                this.spreadSheetManipulator.updateShinkanUpdatedAt(shinkan, exsistingShinkan);
                Logger.log(shinkan.title + "は一致したので日付だけ更新");
                updated = true;
                // someにtrueを返すことでbreak扱いになる
                // @see https://scrapbox.io/kadoyau/JavaScript%E3%81%AE%E9%85%8D%E5%88%97
                return true;
            }
        });

        return updated;
    }

    /**
     * 既存の新刊を取得する
     */
    private getExistingShinkans(): Shinkan[] {
        return this.spreadSheetManipulator.fetchShinkans();
    }

    /**
     * 新刊情報を取得する
     * @param mailPlainBody メール本文
     * @param date
     */
    private getShinkansFromMail(mailPlainBody: string, date: Date): Shinkan[] {
        const circleNameAndShinkanInfoDrafts = this.getCircleNameAndShinkanInfoDrafts(mailPlainBody);
        const ret = [];
        circleNameAndShinkanInfoDrafts.map(([circleName, shinkanInfoDrafts]) => {
            this.getTitleAndUrls(shinkanInfoDrafts).map(([title, url]) => {
                // 新規追加なのでromwIndexはnull
                ret.push(new Shinkan(circleName, title, url, date, date, null));
            });
        });
        return ret;
    }

    /**
     * 新刊のタイトルと購入URLの配列を返す
     * @param shinkanInfoDrafts "新刊タイトル1\nURL1/n新刊タイトル2\nURL2"
     * @return [["新刊タイトル1", "URL1"], ["新刊タイトル2", "URL2"]]
     */
    private getTitleAndUrls(shinkanInfoDrafts: string): Array<[string, string]> {
        const productRegExp = /(.*)\s+(http[s]?.*)/g;
        const titleANdUrlDrafts = ToranoanaChecklistGenerator.executeRegExp(productRegExp, shinkanInfoDrafts);
        return titleANdUrlDrafts.map((titleAndUrlDraft) => {
            const title: string = titleAndUrlDraft[1].trim();
            const url: string = titleAndUrlDraft[2].trim();
            return [title, url];
        });
    }

    /**
     * 新刊情報のドラフトを返す
     *
     * @param mailPlainBody メール本文
     * @return [["「登録サークル」のサークル名","「入荷商品一覧」の新刊タイトル\s+URL新刊タイトル2\s+URL2..."], ...]
     * 「入荷商品一覧」のstringは、奇数行にタイトル、偶数行に商品リンクがある
     * この時点では改行コードは複数の候補がある（[\r\n ]など）
     *  例：この世界の終わりまで\nhttps://ec.toranoana.jp/tora_r/ec/item/040030655008/
     */
    private getCircleNameAndShinkanInfoDrafts(mailPlainBody: string): Array<[string, string]> {
        const regexp = /■登録サークル\s+(.*)\s+■入荷商品一覧\s+((?:.*\s+http[s]?:.*\s+)+)/g;
        const circleNameAndShinkanInfoDrafts = ToranoanaChecklistGenerator.executeRegExp(regexp, mailPlainBody);
        return circleNameAndShinkanInfoDrafts.map((circleNameAndShinkanInfoDraft) => {
            const circleName: string = circleNameAndShinkanInfoDraft[1].trim();
            const shinkanInfoDrafts: string = circleNameAndShinkanInfoDraft[2].trim();
            return [circleName, shinkanInfoDrafts];
        });
    }

}

export default ToranoanaChecklistGenerator;
