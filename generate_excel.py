"""
BEEFLOW - Generador de Plantilla Oficial de Auditoría en Excel (.xlsx)
Opción C: Script usando openpyxl configurado para impresión A4 Horizontal / PDF.

Requisitos:
  pip install openpyxl
Uso:
  python generate_excel.py
"""

import sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def build_beeflow_excel(filename="Formulario_Auditoria_BEEFLOW.xlsx"):
    wb = Workbook()
    ws = wb.active
    ws.title = "Auditoría BEEFLOW"

    # 1. Configuración de página para impresión exacta (A4 Landscape)
    ws.page_setup.orientation = ws.ORIENTATION_LANDSCAPE
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.page_setup.fitToPage = True
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 1
    ws.sheet_properties.pageSetUpPr.fitToPage = True

    # Márgenes en pulgadas (aprox 12mm top/bottom, 15mm left/right)
    ws.page_margins.top = 0.45
    ws.page_margins.bottom = 0.40
    ws.page_margins.left = 0.55
    ws.page_margins.right = 0.55

    # 2. Estilos comunes
    font_title = Font(name="Arial", size=15, bold=True)
    font_instructions = Font(name="Arial", size=8, bold=False)
    font_inst_bold = Font(name="Arial", size=8, bold=True)
    font_meta_lbl = Font(name="Arial", size=9.5, bold=True)
    font_meta_val = Font(name="Arial", size=9.5, bold=False)
    font_th = Font(name="Arial", size=9, bold=True)
    font_row_id = Font(name="Arial", size=9.5, bold=False)
    font_digit = Font(name="Arial", size=9.5, bold=True)
    font_x = Font(name="Arial", size=9.5, bold=True)
    font_note = Font(name="Arial", size=8, italic=True, color="555555")

    align_center = Alignment(horizontal="center", vertical="center")
    align_left = Alignment(horizontal="left", vertical="center")
    align_right = Alignment(horizontal="right", vertical="center")

    thin_border_side = Side(border_style="thin", color="000000")
    box_border = Border(
        top=thin_border_side,
        bottom=thin_border_side,
        left=thin_border_side,
        right=thin_border_side
    )

    # 3. Anchos de Columna
    # Columnas Tabla Izquierda: A=N°/ID, B=Marcos, C=Muerta, D=Maxpoll, E=Tobee, F=Torta P.
    # Columna Separadora: G=Espacio central
    # Columnas Tabla Derecha: H=N°/ID, I=Marcos, J=Muerta, K=Maxpoll, L=Tobee, M=Torta P.
    col_widths = {
        'A': 8.5,   # N° (Identificador ej. C104)
        'B': 9.5,   # Marcos
        'C': 7.5,   # Muerta
        'D': 7.5,   # Maxpoll
        'E': 7.5,   # Tobee
        'F': 7.5,   # Torta P.
        'G': 4.0,   # Separador central
        'H': 8.5,   # N° (Identificador ej. C124)
        'I': 9.5,   # Marcos
        'J': 7.5,   # Muerta
        'K': 7.5,   # Maxpoll
        'L': 7.5,   # Tobee
        'M': 7.5,   # Torta P.
    }
    for col, width in col_widths.items():
        ws.column_dimensions[col].width = width

    # 4. Fila 1: Título Centrado
    ws.merge_cells("A1:M1")
    cell_title = ws["A1"]
    cell_title.value = "Formulario de auditoria de servicio - BEEFLOW"
    cell_title.font = font_title
    cell_title.alignment = align_center
    ws.row_dimensions[1].height = 24

    # 5. Filas 2-3: Instrucciones
    ws.merge_cells("A2:M2")
    ws["A2"].value = "INSTRUCCIONES: Escriba un solo digito claro dentro de cada recuadro para el numero de marcos cubiertos con abejas."
    ws["A2"].font = font_instructions
    ws["A2"].alignment = align_left
    ws.row_dimensions[2].height = 13

    ws.merge_cells("A3:M3")
    ws["A3"].value = "Marque con \"X\" en el recuadro de Muerta, Maxpoll, ToBEE, Torta P. en caso que corresponda."
    ws["A3"].font = font_instructions
    ws["A3"].alignment = align_left
    ws.row_dimensions[3].height = 14

    # 6. Filas 4-5: Metadatos
    # Fila 4: CAMPO (A4-D4), APICULTOR (H4-K4), FECHA (L4-M4)
    ws["A4"].value = "CAMPO:  FUNDO SANTA TERESA"
    ws["A4"].font = font_meta_lbl
    ws["A4"].alignment = align_left

    ws["H4"].value = "APICULTOR:  JUAN CARLOS M."
    ws["H4"].font = font_meta_lbl
    ws["H4"].alignment = align_left

    ws["L4"].value = "FECHA:  12/04/2026"
    ws["L4"].font = font_meta_lbl
    ws["L4"].alignment = align_left
    ws.row_dimensions[4].height = 16

    # Fila 5: PROYECTO (A5-D5), LOTE (H5-K5)
    ws["A5"].value = "PROYECTO:  ARANDANO 2026"
    ws["A5"].font = font_meta_lbl
    ws["A5"].alignment = align_left

    ws["H5"].value = "LOTE:  LOTE 3B"
    ws["H5"].font = font_meta_lbl
    ws["H5"].alignment = align_left
    ws.row_dimensions[5].height = 18

    # Espacio previo a la tabla
    ws.row_dimensions[6].height = 6

    # 7. Fila 7: Encabezados de Columna
    headers_left = [("A7", "N°"), ("B7", "Marcos"), ("C7", "Muerta"), ("D7", "Maxpoll"), ("E7", "Tobee"), ("F7", "Torta P.")]
    headers_right = [("H7", "N°"), ("I7", "Marcos"), ("J7", "Muerta"), ("K7", "Maxpoll"), ("L7", "Tobee"), ("M7", "Torta P.")]

    for pos, text in headers_left + headers_right:
        cell = ws[pos]
        cell.value = text
        cell.font = font_th
        if "N°" in text or "Marcos" in text:
            cell.alignment = align_left
        else:
            cell.alignment = align_center

    ws.row_dimensions[7].height = 18

    # 8. Filas 8 a 27 (20 filas de datos por columna)
    start_row = 8
    num_rows = 20

    # Demo colmenas C104 a C143 (idéntico a la Página 1 oficial)
    for i in range(num_rows):
        r = start_row + i
        ws.row_dimensions[r].height = 17.5

        # Columna Izquierda (C104 a C123)
        left_id = f"C{104 + i}"
        ws[f"A{r}"].value = left_id
        ws[f"A{r}"].font = font_row_id
        ws[f"A{r}"].alignment = align_left

        # Marcos (vacío para escritura o OCR)
        ws[f"B{r}"].value = ""
        ws[f"B{r}"].alignment = align_center

        # Checkboxes Izquierda: Muerta, Maxpoll, Tobee, Torta P.
        for c_idx, col_letter in enumerate(["C", "D", "E", "F"]):
            cell = ws[f"{col_letter}{r}"]
            cell.border = box_border
            cell.alignment = align_center
            # En la Página 1 oficial: Maxpoll y Tobee tienen "X"
            if col_letter in ["D", "E"]:
                cell.value = "X"
                cell.font = font_x
            else:
                cell.value = ""

        # Columna Derecha (C124 a C143)
        right_id = f"C{124 + i}"
        ws[f"H{r}"].value = right_id
        ws[f"H{r}"].font = font_row_id
        ws[f"H{r}"].alignment = align_left

        # Marcos
        ws[f"I{r}"].value = ""
        ws[f"I{r}"].alignment = align_center

        # Checkboxes Derecha
        for c_idx, col_letter in enumerate(["J", "K", "L", "M"]):
            cell = ws[f"{col_letter}{r}"]
            cell.border = box_border
            cell.alignment = align_center
            if col_letter in ["K", "L"]:
                cell.value = "X"
                cell.font = font_x
            else:
                cell.value = ""

    # 9. Fila 29: Nota al pie OCR oficial
    ws.merge_cells("A29:M29")
    note_cell = ws["A29"]
    note_cell.value = "Nota: la columna N° queda vacia a proposito; el sistema OCR no la interpreta."
    note_cell.font = font_note
    note_cell.alignment = align_left
    ws.row_dimensions[29].height = 16

    # Guardar libro
    wb.save(filename)
    print(f"Archivo Excel generado con éxito: {filename}")
    return filename

if __name__ == "__main__":
    out = "Formulario_Auditoria_BEEFLOW.xlsx"
    if len(sys.argv) > 1:
        out = sys.argv[1]
    build_beeflow_excel(out)
