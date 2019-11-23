import ChecklistGenerator from "./ChecklistGenerator";
import {IShinkanDraft} from "./IShinkanDraft";
import SpreadSheetManipulator from "./SpreadSheetManipulator";

class MelonbooksChecklistGenerator extends ChecklistGenerator {
    protected fromAddress = "tsuhan@melonbooks.co.jp";
    protected mailTitle = "新着アイテムのお知らせ";

    constructor() {
        super();
        const sheetName = PropertiesService.getScriptProperties().getProperty("MELONBOOKS_SHEET_NAME");
        this.spreadSheetManipulator = new SpreadSheetManipulator(sheetName);
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
