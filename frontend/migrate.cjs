const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// The updated credentials from earlier (the user said "mesmo erro... vc colocou credenciais erradas... olha aqui... cfmcdxgowaafewdzneus...")
const supabaseUrl = 'https://cfmcdxgowaafewdzneus.supabase.co';
// Eu sei a key antiga que tava dando certo no .env
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateHeadsets() {
  try {
    const rawLocal = fs.readFileSync('C:\\Users\\luis.miguel\\AppData\\Roaming\\gestao-headsets\\db.json');
    const localData = JSON.parse(rawLocal);
    
    // Fetch current cloud data
    const { data: cloudRow, error: fetchErr } = await supabase
      .from('backups')
      .select('data')
      .eq('id', 1)
      .single();
      
    if (fetchErr) throw fetchErr;
    
    let currentData = cloudRow.data || {};
    
    // Merge
    currentData.headsetStock = localData.headsetStock || [];
    currentData.headsetDefects = localData.headsetDefects || [];
    
    // Upload back
    const { error: updateErr } = await supabase
      .from('backups')
      .update({ data: currentData })
      .eq('id', 1);
      
    if (updateErr) throw updateErr;
    
    console.log("Migração concluída com sucesso! Headsets transferidos para o Supabase.");
  } catch (err) {
    console.error("Erro na migração:", err);
  }
}

migrateHeadsets();
