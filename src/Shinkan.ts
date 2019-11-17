/**
 * 新刊のレコードに対応するオブジェクト
 * objectにしないとfindとか使えなくて不便だった
 */
class Shinkan {
    /**
     * 新刊タイトル
     */
    public readonly title: string;
    /**
     * 新刊URL
     */
    public readonly url: string;
    /**
     * サークル名
     */
    public readonly circleName: string;
    /**
     * 生成日
     */
    public readonly createdAt: Date;
    /**
     * 情報更新日
     */
    public readonly updatedAt: Date | null;
    /**
     * 行数
     */
    public readonly rowIndex: number | null;

    constructor(
        circleName: string,
        title: string,
        url: string,
        createdAt: Date,
        updatedAt: Date | null,
        rowIndex: number | null
    ) {
        this.circleName = circleName;
        this.title = title;
        this.url = url;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.rowIndex = rowIndex;
    }

}

export default Shinkan;
