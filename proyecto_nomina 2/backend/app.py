import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS # Necesario para permitir solicitudes desde el navegador
import random
import os

app = Flask(__name__)
CORS(app)

# ----------------------------
# Constantes de Nómina 2024/2025 - Colombia
# ----------------------------
SMMLV = 1423500  # Salario mínimo mensual legal vigente
SUBSIDIO_TRANSPORTE_VALOR = 200000
SALUD_PORCENTAJE = 0.04
PENSION_PORCENTAJE = 0.04
RETENCION_PORCENTAJE = 0.04

# ----------------------------
# Rutas de archivos CSV
# ----------------------------
USUARIOS_CSV = 'usuarios.csv'
NOMINA_CSV = 'nomina_test.csv'
EMPLOYEES_CSV_PATH = 'empleados.csv' # ¡Esta línea debe estar aquí!

# Crear archivos si no existen
if not os.path.exists(USUARIOS_CSV):
    pd.DataFrame(columns=["email", "password"]).to_csv(USUARIOS_CSV, index=False)

if not os.path.exists(NOMINA_CSV):
    pd.DataFrame(columns=[
        "employee", "periodType", "startDate", "endDate",
        "grossSalary", "bonuses", "deductions", "comments",
        "subsidio_transporte", "aporte_salud_empleado",
        "retencion_en_la_fuente", "netSalary"
    ]).to_csv(NOMINA_CSV, index=False)

# Crear el archivo empleados.csv si no existe, con columnas 'id' y 'name'
if not os.path.exists(EMPLOYEES_CSV_PATH):
    pd.DataFrame(columns=["id", "name"]).to_csv(EMPLOYEES_CSV_PATH, index=False)
    print(f"Archivo '{EMPLOYEES_CSV_PATH}' creado con columnas 'id' y 'name'.")


# ----------------------------
# Endpoint: Registro
# ----------------------------
@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return jsonify({"success": False, "message": "Faltan datos requeridos."}), 400

        usuarios_df = pd.read_csv(USUARIOS_CSV)

        if email in usuarios_df['email'].values:
            return jsonify({"success": False, "message": "El correo ya está registrado."}), 409

        nuevo_usuario = pd.DataFrame([{"email": email, "password": password}])
        usuarios_df = pd.concat([usuarios_df, nuevo_usuario], ignore_index=True)
        usuarios_df.to_csv(USUARIOS_CSV, index=False)

        return jsonify({"success": True, "message": "Registro exitoso."}), 201

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

# ----------------------------
# Endpoint: Login
# ----------------------------
@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get("email", "").strip()
        password = data.get("password", "").strip()

        print(f"[LOGIN] Email recibido: {email}")
        print(f"[LOGIN] Password recibido: {password}")

        if not os.path.exists(USUARIOS_CSV):
            return jsonify({"success": False, "message": "Base de datos de usuarios no encontrada."}), 500

        usuarios_df = pd.read_csv(USUARIOS_CSV)
        usuarios_df['email'] = usuarios_df['email'].astype(str).str.strip()
        usuarios_df['password'] = usuarios_df['password'].astype(str).str.strip()

        print(f"[LOGIN] Contenido actual del CSV:\n{usuarios_df}")

        match = usuarios_df[
            (usuarios_df['email'] == email) &
            (usuarios_df['password'] == password)
        ]

        if not match.empty:
            # *** CAMBIO AQUÍ: Añadir el email al JSON de respuesta ***
            return jsonify({
                "success": True,
                "message": "Inicio de sesión exitoso",
                "redirect_to": "dashboard.html",
                "username": email # Enviar el email como 'username'
            }), 200

        return jsonify({"success": False, "message": "Credenciales incorrectas."}), 401

    except Exception as e:
        print(f"[ERROR LOGIN]: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

# ----------------------------
# Endpoint: Procesar Nómina
# ----------------------------
@app.route('/api/process-payroll', methods=['POST'])
def process_payroll():
    try:
        data = request.get_json()

        # Extraer datos con valores por defecto para evitar errores si faltan
        gross_salary = float(data.get('grossSalary', 0))
        bonuses = float(data.get('bonuses', 0))
        deductions = float(data.get('deductions', 0))
        employee = data.get('employee', 'N/A')
        period_type = data.get('periodType', 'N/A')
        start_date = data.get('startDate', 'N/A')
        end_date = data.get('endDate', 'N/A')
        comments = data.get('comments', '')

        # --- Lógica de cálculo de nómina (ejemplo simplificado) ---
        # Aquí es donde deberías tener tu lógica real de cálculo.
        # Los valores son ejemplos y no representan cálculos reales de nómina colombiana.

        # Deducciones fijas (ejemplo: 4% salud, 4% pensión sobre salario bruto)
        salud_empleado = gross_salary * 0.04
        pension_empleado = gross_salary * 0.04
        retencion_en_la_fuente = 0 # Retención en la fuente - cálculo complejo, simplificado aquí

        # Subsidio de transporte (ejemplo: valor fijo si el salario es bajo)
        subsidio_transporte = 0
        if gross_salary < (2 * SMMLV): # Ejemplo: si salario es menor a 2 SMLV (SMLV 2025= 1'423.500 COP)
            subsidio_transporte = SUBSIDIO_TRANSPORTE_VALOR # Ejemplo de valor de subsidio de transporte 2025

        # Salario base para cálculos de seguridad social (salario bruto + bonificaciones no salariales si aplica)
        # Simplificación: usamos gross_salary
        base_salarial_seg_social = gross_salary
        
        # Calcular la retención en la fuente (ejemplo extremadamente simplificado, la lógica real es muy compleja)
        # Esto debería basarse en la tabla de retención en la fuente de la DIAN y el UVT
        renta_gravable = (gross_salary + bonuses) - (salud_empleado + pension_empleado +  deductions)
        if renta_gravable > 4000000: # Ejemplo: si la renta gravable supera un umbral
            retencion_en_la_fuente = renta_gravable * 0.04 # Ejemplo: 4%

        # Salario neto = salario bruto + bonificaciones + subsidio transporte - deducciones fijas - otras deducciones  - retención
        net_salary = (gross_salary + bonuses + subsidio_transporte) - \
                     (salud_empleado + pension_empleado + retencion_en_la_fuente + deductions)


        details = {
            "grossSalary": gross_salary,
            "bonuses": bonuses,
            "subsidio_transporte": subsidio_transporte,
            "deductions": deductions, # Otras deducciones ingresadas por el usuario
            "aporte_salud_empleado": salud_empleado,
            "aporte_pension_empleado": pension_empleado,
            "retencion_en_la_fuente": retencion_en_la_fuente,
            # Puedes añadir más detalles de cálculo aquí si es necesario
        }

        return jsonify({
            "success": True,
            "netSalary": net_salary,
            "details": details,
            "message": "Nómina procesada con éxito."
        })

    except ValueError:
        return jsonify({"success": False, "message": "Datos numéricos inválidos proporcionados."}), 400
    except Exception as e:
        # Imprime el error completo en la consola del servidor para depuración
        print(f"Error al procesar nómina: {e}")
        return jsonify({"success": False, "message": f"Error interno del servidor: {e}"}), 500

@app.route('/api/get-payroll-tip', methods=['GET'])
def get_payroll_tip():
    try:
        # Aquí podrías integrar con un modelo de IA (como Gemini)
        # Por ahora, un consejo simple.
        tips = [
            "Recuerda que los aportes a seguridad social (salud y pensión) son obligatorios en Colombia.",
            "El subsidio de transporte aplica para empleados que ganan hasta 2 salarios mínimos mensuales legales vigentes (SMMLV).",
            "La retención en la fuente sobre salarios es un cálculo complejo basado en la UVT y la tabla de la DIAN.",
            "Las cesantías, intereses sobre cesantías, primas y vacaciones son prestaciones sociales que debes considerar.",
            "Mantén un registro detallado de todas las horas extras y recargos nocturnos o dominicales."
        ]
        import random
        tip = random.choice(tips)
        return jsonify({"success": True, "tip": tip})
    except Exception as e:
        print(f"Error al obtener consejo: {e}")
        return jsonify({"success": False, "message": "No se pudo generar el consejo."}), 500

# ----------------------------
# Ruta para obtener la lista de empleados (¡Debe estar aquí!)
# ----------------------------
@app.route('/api/employees', methods=['GET'])
def get_employees():
    if not os.path.exists(EMPLOYEES_CSV_PATH):
        # Este mensaje de error debería ser menos común ahora que el archivo se crea automáticamente.
        return jsonify({"error": "Archivo 'empleados.csv' no encontrado."}), 404
    try:
        df = pd.read_csv(EMPLOYEES_CSV_PATH)
        
        # Verificar si las columnas 'id' y 'name' existen antes de seleccionarlas
        if 'id' in df.columns and 'name' in df.columns:
            employees_list = df[['id', 'name']].to_dict(orient='records')
            return jsonify(employees_list)
        else:
            return jsonify({"error": "Las columnas 'id' o 'name' no se encontraron en 'empleados.csv'. Asegúrate de que el CSV tenga estas columnas."}), 500
    except Exception as e:
        return jsonify({"error": f"Error al leer empleados.csv: {str(e)}"}), 500
    
#####################################################################
#Grafico
 

@app.route('/api/net-salaries', methods=['GET'])
def get_net_salaries():
    """
    Lee los datos de 'employee' y 'netSalary' desde nomina_test.csv
    y los devuelve como una respuesta JSON.
    """
    try:
        # Lee el archivo CSV en un DataFrame de pandas
        df_nomina = pd.read_csv(NOMINA_CSV)

        # Verifica que las columnas 'employee' y 'netSalary' existan
        if 'employee' in df_nomina.columns and 'netSalary' in df_nomina.columns:
            # Prepara los datos en un formato que Chart.js pueda consumir fácilmente:
            # Una lista de diccionarios, cada uno con 'name' (empleado) y 'salary' (salario neto)
            net_salaries_data = df_nomina[['employee', 'netSalary']].rename(
                columns={'employee': 'name', 'netSalary': 'salary'}
            ).to_dict(orient='records')
            
            return jsonify(net_salaries_data)
        else:
            # Si las columnas necesarias no existen, devuelve un error 400
            return jsonify({"error": "El CSV debe contener las columnas 'employee' y 'netSalary'"}), 400
    except FileNotFoundError:
        # Si el archivo CSV no se encuentra, devuelve un error 404
        return jsonify({"error": f"Archivo no encontrado: {NOMINA_CSV}. Asegúrate de que esté en la misma carpeta."}), 404
    except Exception as e:
        # Captura cualquier otro error durante el procesamiento del CSV
        return jsonify({"error": f"Ocurrió un error al procesar el CSV: {str(e)}"}), 500

# ----------------------------
# Ejecutar la aplicación
# ----------------------------
if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
