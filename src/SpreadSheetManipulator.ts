/**
 * GASのspread sheetを操作するためのクラス
 */
import Shinkan from "./Shinkan";

class SpreadSheetManipulator {
    private SPREAD_SHEET_ID = PropertiesService.getScriptProperties().getProperty("SPREAD_SHEET_ID");
    private spreadSheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
    private sheet: GoogleAppsScript.Spreadsheet.Sheet;
    private readonly columnMapper = {
        // google sheetsは1-index
        circleName: 1,
        title: 2,
        url: 3,
        createdAt: 4,
        updatedAt: 5,
    };
    private sheetName: string;

    constructor(sheetName: string) {
        this.sheetName = sheetName;
        this.spreadSheet = SpreadsheetApp.openById(this.SPREAD_SHEET_ID);
        this.sheet = this.spreadSheet.getSheetByName(this.sheetName);
    }

    /**
     * 新規に新刊を追加する
     * @param shinkan
     * @param date
     */
    public addShinkan(shinkan: Shinkan, date: Date) {
        this.sheet.appendRow([
            shinkan.circleName,
            shinkan.title,
            shinkan.url,
            Utilities.formatDate(shinkan.createdAt, "JST", "yyyy/MM/dd"),
            Utilities.formatDate(shinkan.createdAt, "JST", "yyyy/MM/dd"),
            false, // 新しいので買ってないだろう
        ]);
    }

    /**
     * 新刊のUpdatedAtを更新する
     * @param shinkan
     * @param existingShinkan
     */
    public updateShinkanUpdatedAt(shinkan: Shinkan, existingShinkan: Shinkan) {
        // メールが送られてきた日で更新する
        this.sheet.getRange(existingShinkan.rowIndex, this.columnMapper.updatedAt)
            .setValue(Utilities.formatDate(shinkan.createdAt, "JST", "yyyy/MM/dd"));
    }

    public fetchShinkans(): Shinkan[] {
        const records = this.sheet.getDataRange().getValues();
        return records.map((record, index) => {
            return new Shinkan(
                // Google Sheetは1-indexだけど、JSの配列は0-index
                record[this.columnMapper.circleName - 1],
                record[this.columnMapper.title - 1],
                record[this.columnMapper.url - 1],
                record[this.columnMapper.createdAt - 1],
                record[this.columnMapper.updatedAt - 1],
                index + 1, // Google Spread sheetの行数は1-index
            );
        });
    }
}

export default SpreadSheetManipulator;
