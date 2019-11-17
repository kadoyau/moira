class GmailQueryBuilder {
    /**
     * Gmailの"n日前以降"（after:)のクエリを生成する
     * @param nThAfter n日前。
     * @return string n=1で今日が2019/11/16なら"2019/11/15"を返す
     */
    public static createDateAfterQuery(nThAfter: number): string {
        const now = new Date();
        const DAY_MS = 86400000;
        const dateAfter = new Date();
        dateAfter.setTime(now.getTime() - nThAfter * DAY_MS);
        const ymd = Utilities.formatDate(dateAfter, "JST", "yyyy/MM/dd");
        return "after:" + ymd;
    }
}

export default GmailQueryBuilder;
