const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function updateGrade(code, grade) {
    console.log(`Updating grade for ${code} to ${grade}...`);
    try {
        const res = await axios.post(`${BASE_URL}/mock/update-grade`, { code, grade });
        console.log('Success:', res.data.item);
    } catch (e) {
        console.error('Error:', e.response?.data || e.message);
    }
}

async function addElement(code, name, grade) {
    console.log(`Adding element ${code} with grade ${grade}...`);
    try {
        const res = await axios.post(`${BASE_URL}/mock/add-element`, { code, name, grade });
        console.log('Success:', res.data.item);
    } catch (e) {
        console.error('Error:', e.response?.data || e.message);
    }
}

const action = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv[4];
const arg3 = process.argv[5];

if (action === 'update') {
    updateGrade(arg1, arg2);
} else if (action === 'add') {
    addElement(arg1, arg2, arg3);
} else {
    console.log('Usage:');
    console.log('  node test-mock.js update <CodeElem> <NewGrade>');
    console.log('  node test-mock.js add <CodeElem> <Name> <Grade>');
}


//    - Test Grade Initialization: node test-mock.js update INFO402_1 14,00
//    - Test Grade Update: node test-mock.js update INFO401_1 19,50
//    - Test New Element: node test-mock.js add NEW_ITEM "Projet de Fin d'Année" 18,00