const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const dotenv = require('dotenv');
const { uploadPDFandMapping } = require('./uploadService');

async function main() {
  const { envChoice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'envChoice',
      message: 'Choose environment:',
      choices: ['NA', 'EMEA']
    }
  ]);

  dotenv.config({ path: `./env/.env.${envChoice.toLowerCase()}` });

  const folderPath = `./reg_cards/${envChoice}/`;
  const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.pdf'));

  if (files.length === 0) {
    console.log('❌ No PDF files found.');
    return;
  }

  for (const file of files) {
    const propertyCode = path.basename(file, '.pdf');
    const filePath = path.join(folderPath, file);
    console.log(`📄 Processing property: ${propertyCode}...`);

    await uploadPDFandMapping(propertyCode, filePath);

    console.log(`✅ Finished ${propertyCode}\n`);
  }
}

main();
