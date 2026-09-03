export const generateBrokerEnquiryMessage = (brokerName, materialNameEn, materialNameHi) => {
  const monthNamesHi = ['जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितम्बर', 'अक्टूबर', 'नवम्बर', 'दिसम्बर'];
  const d = new Date();
  const dateHi = `${String(d.getDate()).padStart(2, '0')} ${monthNamesHi[d.getMonth()]} ${d.getFullYear()}`;
  
  let matName = 'कच्चा माल';
  if (materialNameEn && materialNameHi) {
    matName = `${materialNameEn} (${materialNameHi})`;
  } else if (materialNameHi) {
    matName = materialNameHi;
  } else if (materialNameEn) {
    matName = materialNameEn;
  }

  return `नमस्ते ${brokerName} जी,

आज के लिए कृपया नीचे की जानकारी शेयर कर दीजिए:

माल: ${matName}
तारीख: ${dateHi}

आज का भाव: ₹_____ / क्विंटल
डिलीवरी बेसिस: _____
लोडिंग: _____

कृपया आज का लागू भाव और शर्तें बता दीजिए।

धन्यवाद
Shubh Labh`;
};
