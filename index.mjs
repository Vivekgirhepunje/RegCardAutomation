import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";
import readline from "readline";
// ===== CONFIG =====
const BASE_URL = "https://00.us-east-1.stage.ihg.hotelkeyapp.com/v4-reports/ihg/properties";
const REG_CARDS_DIR = "./regCards";
const PROP_ID_MAP_FILE = "./property_id_map.json";
const FIELD_MAPPING_FILE = "./field_mapping_stage.json";

// ===== ASK FOR BEARER TOKEN =====
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askToken() {
  return new Promise((resolve) => {
    rl.question("Enter Bearer token: ", (token) => {
      rl.close();
      resolve(token.trim());
    });
  });
}

// ===== LOAD FILES =====
function loadPropertyMap() {
  if (!fs.existsSync(PROP_ID_MAP_FILE)) {
    console.error(`❌ Missing ${PROP_ID_MAP_FILE}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(PROP_ID_MAP_FILE, "utf-8"));
}

function loadFieldMapping() {
  if (!fs.existsSync(FIELD_MAPPING_FILE)) {
    console.error(`❌ Missing ${FIELD_MAPPING_FILE}`);
    process.exit(1);
  }
  const json = JSON.parse(fs.readFileSync(FIELD_MAPPING_FILE, "utf-8"));
  if (!Array.isArray(json.parameter_mappings)) {
    console.error("❌ 'parameter_mappings' array missing in field_mapping_stage.json");
    process.exit(1);
  }
  return json.parameter_mappings;
}

// ===== API CALLS =====
async function sendOptionsRequest(propertyId, token) {
  const url = `${BASE_URL}/${propertyId}/dynamic-forms`;
  await axios.options(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function uploadPdf(propertyId, pdfPath, token) {
  const url = `${BASE_URL}/${propertyId}/dynamic-forms`;
  const form = new FormData();
  form.append("type", "REGISTRATION_CARD");
  form.append("file", fs.createReadStream(pdfPath));

  const res = await axios.post(url, form, {
    headers: {
      ...form.getHeaders(),
      Authorization: `Bearer ${token}`
    }
  });
  return res.data.filename;
}

// async function uploadMapping(propertyId, fileName, parameterMappings, token) {
//   const url = `${BASE_URL}/${propertyId}/dynamic-forms`;
//   const payload = {
//     form_type: "pdf_acro_form",
//     type: "REGISTRATION_CARD",
//     name: "REGISTRATION_CARD",
//     property_id: propertyId,
//     file_name: fileName,
//     active: true,
//     parameter_mappings: parameterMappings,
//     form_id: null,
//     attachment_custom_report_configurations: null,
//     data_sources: null,
//     id: null,
//     created_at: null,
//     updated_at: null,
//     deleted_at: null
//   };

//   await axios.put(url, payload, {
//     headers: {
//       Authorization: `Bearer ${token}`,
//       "Content-Type": "application/json"
//     }
//   });
// }










//====== Trail code ========





async function uploadMapping(propertyId, fileName, parameterMappings, token) {
  const url = `${BASE_URL}/${propertyId}/dynamic-forms`;
  const payload = {
    form_type: "pdf_acro_form",
    type: "REGISTRATION_CARD",
    name: "REGISTRATION_CARD",
    property_id: propertyId,
    file_name: fileName,
    active: true,
    parameter_mappings: parameterMappings,
    form_id: null,
    attachment_custom_report_configurations: null,
    data_sources: null,
    id: uuidv4(),
    created_at: null,
    updated_at: null,
    deleted_at: null
  };

  await axios.put(url, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });
}


//===== Trial Code End here =====================




















// ===== MAIN SCRIPT =====
(async () => {
  const token = await askToken();
  const propertyMap = loadPropertyMap();
  const parameterMappings = loadFieldMapping();

  const regCards = fs.readdirSync(REG_CARDS_DIR).filter(file => file.endsWith(".pdf"));

  if (regCards.length === 0) {
    console.error("❌ No PDF files found in regCards folder.");
    process.exit(1);
  }

  for (const file of regCards) {
    const propertyName = path.parse(file).name;
    const propertyId = propertyMap[propertyName];

    if (!propertyId) {
      console.warn(`⚠️ Skipping "${propertyName}" - No property_id found in ${PROP_ID_MAP_FILE}`);
      continue;
    }

    const pdfPath = path.join(REG_CARDS_DIR, file);

    try {
      console.log(`\n📌 Processing: ${propertyName} (${propertyId})`);

      await sendOptionsRequest(propertyId, token);
      console.log("   ✅ OPTIONS request successful");

      const filename = await uploadPdf(propertyId, pdfPath, token);
      console.log(`   ✅ PDF uploaded, got filename: ${filename}`);

      await uploadMapping(propertyId, filename, parameterMappings, token);
      console.log(`   ✅ Mapping uploaded for ${propertyName}`);

    } catch (err) {
      console.error(`   ❌ Error processing ${propertyName}:`, err.response?.data || err.message);
    }
  }
})();
