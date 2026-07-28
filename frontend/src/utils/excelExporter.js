import * as XLSX from 'xlsx';

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
    XLSX.writeFile(workbook, fileName);
    return true;
  } catch (error) {
    console.error("Erro ao gerar arquivo Excel:", error);
    alert('Ocorreu um erro ao gerar a planilha.');
    return false;
  }
}
