import {IShinkanDraft} from "./IShinkanDraft";
import Shinkan from "./Shinkan";
import SpreadSheetManipulator from "./SpreadSheetManipulator";
import GmailMessage = GoogleAppsScript.Gmail.GmailMessage;

/**
 * 基底クラス
 */
abstract class ChecklistGenerator {

    /**
     * 正規表現を実行してグループの情報を返す
     * @see https://scrapbox.io/kadoyau/JavaScript%E3%81%AE%E6%AD%A3%E8%A6%8F%E8%A1%A8%E7%8F%BE%E3%81%A7%E3%81%AF%E3%81%BE%E3%81%A3%E3%81%9F%E3%81%93%E3%81%A8
     * @param regexp
     * @param targetText
     */
    protected static executeRegExp(regexp: RegExp, targetText: string): any[] {
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

    protected spreadSheetManipulator: SpreadSheetManipulator;

    /**
     * UseCase
     */
    public saveShinkansFromPromotionMail() {
        const query = this.makeGmailQuery();
        const threads = GmailApp.search(query);

        threads.map((thread) => {
            thread.getMessages().map((message: GmailMessage) => {
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
            GmailApp.moveThreadToArchive(thread);
        });
    }

    /**
     * 継承したサービスで実装してください
     */
    protected abstract makeGmailQuery(): string;

    protected abstract getShinkanDraftsFromMail(mailPlainBody: string): IShinkanDraft[];

    /**
     * 既存の新刊を取得する
     */
    protected getExistingShinkans(): Shinkan[] {
        return this.spreadSheetManipulator.fetchShinkans();
    }

    /**
     * 新刊情報を取得する
     * @param mailPlainBody メール本文
     * @param date
     */
    protected getShinkansFromMail(mailPlainBody: string, date: Date): Shinkan[] {
        const shinkanDrafts = this.getShinkanDraftsFromMail(mailPlainBody);
        const shinkans = [];
        shinkanDrafts.map((shinkanInfo) => {
            // 新規追加なのでromwIndexはnull
            shinkans.push(new Shinkan(shinkanInfo.circleName, shinkanInfo.title, shinkanInfo.url, date, date, null));
        });
        return shinkans;
    }

    /**
     * 新刊情報を保存する
     * URLが一致するものが過去にあれば追加はしない
     * @param shinkans
     * @param existingShinkans
     * @param date
     */
    protected saveShinkan(shinkans: Shinkan[], existingShinkans: Shinkan[], date: Date) {
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
                Logger.log(shinkan.title + "is already exists. Update date column only.");
                updated = true;
                // someにtrueを返すことでbreak扱いになる
                // @see https://scrapbox.io/kadoyau/JavaScript%E3%81%AE%E9%85%8D%E5%88%97
                return true;
            }
        });

        return updated;
    }

}

export default ChecklistGenerator;
