import ToranoanaChecklistGenerator from "./ToranoanaChecklistGenerator";

function main() {
    const checklistGenerator = new ToranoanaChecklistGenerator();
    checklistGenerator.saveProductsFromTranoanaPromotionMail();
}
