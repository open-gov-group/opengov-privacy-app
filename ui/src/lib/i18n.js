const dict = {
  de: { load:"Laden", populateIr:"Implemented Requirements befüllen", mapX:"Aus XDOMEA/BPMN übernehmen", evidence:"Nachweise", addToRegistry:"Zum Register & Back-Matter", downloadRegistry:"Register herunterladen", risk:"Risiko-Matrix", qualitative:"Qualitativ", quantitative:"Quantitativ" },
  en: { load:"Load", populateIr:"Populate implemented requirements", mapX:"Map from XDOMEA/BPMN", evidence:"Evidence", addToRegistry:"Add to registry & back-matter", downloadRegistry:"Download registry", risk:"Risk matrix", qualitative:"Qualitative", quantitative:"Quantitative" }
};
export function useI18n(defaultLang="en") {
  const lang = (localStorage.getItem("opgov:lang") || defaultLang);
  const t = (k) => dict[lang]?.[k] || dict.en[k] || k;
  const setLang = (l) => localStorage.setItem("opgov:lang", l);
  return { t, lang, setLang };
}
