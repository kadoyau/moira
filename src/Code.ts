import MelonbooksChecklistGenerator from "./MelonbooksChecklistGenerator";
import ToranoanaChecklistGenerator from "./ToranoanaChecklistGenerator";

function main() {
    const checklistGenerator = new ToranoanaChecklistGenerator();
    checklistGenerator.saveProductsFromPromotionMail();
    const melonbooksChecklistGenerator = new MelonbooksChecklistGenerator();
    melonbooksChecklistGenerator.saveProductsFromPromotionMail();
}
