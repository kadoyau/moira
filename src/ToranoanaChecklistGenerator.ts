import ChecklistGenerator from "./ChecklistGenerator";
import GmailQueryBuilder from "./GmailQueryBuilder";
import {IShinkanDraft} from "./IShinkanDraft";
import SpreadSheetManipulator from "./SpreadSheetManipulator";

class ToranoanaChecklistGenerator extends ChecklistGenerator {
    constructor() {
        super();
        // TODO: 名前変更
        const sheetName = PropertiesService.getScriptProperties().getProperty("SHEET_NAME");
        this.spreadSheetManipulator = new SpreadSheetManipulator(sheetName);
    }

    protected makeGmailQuery() {
        const tranoanaGoodsReceivedMailTitle = "【株式会社　虎の穴】商品入荷のお知らせ（サークル）";
        const dateAfterQuery = GmailQueryBuilder.createDateAfterQuery(3);

        return [tranoanaGoodsReceivedMailTitle, dateAfterQuery].join(" ");
    }

    /**
     * 新刊情報のドラフトを返す
     *
     * @param mailPlainBody メール本文
     */
    protected getShinkanDraftsFromMail(mailPlainBody: string): IShinkanDraft[] {
        const regexp = /■登録サークル\s+(.*)\s+■入荷商品一覧\s+((?:.*\s+http[s]?:.*\s+)+)/g;
        // 「入荷商品一覧」のstringは、奇数行にタイトル、偶数行に商品リンクがある
        // この時点では改行コードは複数の候補がある（[\r\n ]など）
        // 例：この世界の終わりまで\nhttps://ec.toranoana.jp/tora_r/ec/item/040030655008/
        const circleNameAndShinkanInfoDrafts = ToranoanaChecklistGenerator.executeRegExp(regexp, mailPlainBody);

        const shinkans = [];
        circleNameAndShinkanInfoDrafts.map((circleNameAndShinkanInfoDraft) => {
            const circleName: string = circleNameAndShinkanInfoDraft[1].trim();
            const shinkanInfoDrafts: string = circleNameAndShinkanInfoDraft[2].trim();
            const titleAndUrls = this.getTitleAndUrls(shinkanInfoDrafts);
            titleAndUrls.map((tileAndUrl) => {
                shinkans.push(
                    {
                        circleName,
                        title: tileAndUrl.title,
                        url: tileAndUrl.url,
                    });
            });
        });
        return shinkans;
    }

    /**
     * 新刊のタイトルと購入URLの配列を返す
     * @param shinkanInfoDrafts "新刊タイトル1\nURL1/n新刊タイトル2\nURL2"
     */
    private getTitleAndUrls(shinkanInfoDrafts: string): Array<{ title: string, url: string }> {
        const productRegExp = /(.*)\s+(http[s]?.*)/g;
        const titleANdUrlDrafts = ToranoanaChecklistGenerator.executeRegExp(productRegExp, shinkanInfoDrafts);
        return titleANdUrlDrafts.map((titleAndUrlDraft) => {
            return {
                title: titleAndUrlDraft[1].trim(),
                url: titleAndUrlDraft[2].trim(),
            };
        });
    }

}

export default ToranoanaChecklistGenerator;
