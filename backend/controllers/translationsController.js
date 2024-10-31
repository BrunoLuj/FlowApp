import * as translationModel from "../models/translationModel.js";

export const getTranslations = async (req, res) => {
    const { lang } = req.params;
    try {
        const translations = await translationModel.getTranslations(lang);
        res.json(translations);
    } catch (err) {
        console.error("Error fetching translations:", err);
        res.status(500).send('Internal Server Error');
    }
};
