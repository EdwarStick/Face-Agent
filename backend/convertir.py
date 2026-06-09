import base64

# Cambia "foto.jpg" por el nombre de tu foto
with open("foto2.jpg", "rb") as f:
    resultado = base64.b64encode(f.read()).decode()
    print(resultado)