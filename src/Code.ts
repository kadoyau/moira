import MelonbooksChecklistGenerator from "./MelonbooksChecklistGenerator";
import ToranoanaChecklistGenerator from "./ToranoanaChecklistGenerator";

function main() {
    const checklistGenerator = new ToranoanaChecklistGenerator();
    checklistGenerator.saveShinkansFromPromotionMail();
    const melonbooksChecklistGenerator = new MelonbooksChecklistGenerator();
    melonbooksChecklistGenerator.saveShinkansFromPromotionMail();
}
