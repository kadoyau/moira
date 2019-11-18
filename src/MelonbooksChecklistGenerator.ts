import GmailMessage = GoogleAppsScript.Gmail.GmailMessage;
import GmailQueryBuilder from "./GmailQueryBuilder";
import Shinkan from "./Shinkan";
import SpreadSheetManipulator from "./SpreadSheetManipulator";

class MelonbooksChecklistGenerator {

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
        // const sheetName =   PropertiesService.getScriptProperties().getProperty("SHEET_NAME");
        this.spreadSheetManipulator = new SpreadSheetManipulator("melonbooks");
    }

    /**
     * UseCase
     */
    public saveProductsFromPromotionMail() {
        const melonbooksMailAddress = "tsuhan@melonbooks.co.jp";
        const melonBooksGoodsReceivedMailTitle = "新着アイテムのお知らせ";
        const dateAfterQuery = GmailQueryBuilder.createDateAfterQuery(3);
        const query = [`from:(${melonbooksMailAddress})`, melonBooksGoodsReceivedMailTitle, dateAfterQuery].join(" ");
        const threads = GmailApp.search(query);

        threads.map((thread) => {
            thread.getMessages().map((message: GmailMessage) => {
                const plainBody = message.getPlainBody();
                Logger.log(plainBody);
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
     * TODO: 共通化
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
        const shinkanDrafts = this.ShinkanDraftsFromMail(mailPlainBody);
        const shinkans = [];
        shinkanDrafts.map((shinkanInfo) => {
            // 新規追加なのでromwIndexはnull
            shinkans.push(new Shinkan(shinkanInfo.circleName, shinkanInfo.title, shinkanInfo.url, date, date, null));
        });
        return shinkans;
    }

    /**
     * 新刊情報のドラフトを返す
     *
     * @param mailPlainBody メール本文
     */
    private ShinkanDraftsFromMail(mailPlainBody: string): ShinkanDraft[] {
        const regexp = /\d+「(.*)」(\S*).*\s+(http[s]?:.+product_id=\d+).+\s+/g;
        const circleNameAndShinkanInfoDrafts = MelonbooksChecklistGenerator.executeRegExp(regexp, mailPlainBody);
        return circleNameAndShinkanInfoDrafts.map((circleNameAndShinkanInfoDraft) => {
            const title: string = circleNameAndShinkanInfoDraft[1].trim();
            const circleName: string = circleNameAndShinkanInfoDraft[2].trim();
            const url: string = circleNameAndShinkanInfoDraft[3].trim();
            return {title, circleName, url};
        });
    }

}

interface ShinkanDraft {
    title: string;
    circleName: string;
    url: string;
}

export default MelonbooksChecklistGenerator;
