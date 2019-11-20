import ChecklistGenerator from "./ChecklistGenerator";
import GmailQueryBuilder from "./GmailQueryBuilder";
import {IShinkanDraft} from "./IShinkanDraft";
import SpreadSheetManipulator from "./SpreadSheetManipulator";

class MelonbooksChecklistGenerator extends ChecklistGenerator {
    constructor() {
        super();
        const sheetName = PropertiesService.getScriptProperties().getProperty("MELONBOOKS_SHEET_NAME");
        this.spreadSheetManipulator = new SpreadSheetManipulator(sheetName);
    }

    protected makeGmailQuery() {
        const melonbooksMailAddress = "tsuhan@melonbooks.co.jp";
        const melonBooksGoodsReceivedMailTitle = "新着アイテムのお知らせ";
        const dateAfterQuery = GmailQueryBuilder.createDateAfterQuery(3);
        return [`from:(${melonbooksMailAddress})`, melonBooksGoodsReceivedMailTitle, dateAfterQuery].join(" ");
    }

    /**
     * 新刊情報のドラフトを返す
     *
     * @param mailPlainBody メール本文
     */
    protected getShinkanDraftsFromMail(mailPlainBody: string): IShinkanDraft[] {
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

export default MelonbooksChecklistGenerator;
