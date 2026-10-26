import * as XLSX from 'xlsx';

/**
 * Faz o download seguro do arquivo Excel diretamente no navegador via Blob,
 * compatível com Vite, HTTPS e todos os navegadores modernos (evita o crash de fs.writeFileSync).
 */
export function saveWorkbook(workbook, fileName = 'exportacao.xlsx') {
  try {
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' 
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (err) {
    console.error("Erro ao salvar arquivo Excel no navegador:", err);
    throw err;
  }
}

/**
 * Utilitário centralizado para exportação de planilhas Excel (.xlsx)
 * @param {Array<Object>} data Array de objetos contendo os dados a serem exportados
 * @param {string} fileName Nome do arquivo final (ex: 'relatorio.xlsx')
 * @param {string} sheetName Nome da aba na planilha (ex: 'Dados')
 */
export function exportToExcel(data, fileName = 'exportacao.xlsx', sheetName = 'Dados') {
  if (!data || data.length === 0) {
    alert('Não há dados disponíveis para exportar.');
    return false;
  }

  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    saveWorkbook(workbook, fileName);
    return true;
  } catch (error) {
    console.error("Erro ao gerar arquivo Excel:", error);
    alert('Ocorreu um erro ao gerar a planilha.');
    return false;
  }
}
