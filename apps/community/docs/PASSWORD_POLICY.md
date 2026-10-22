# Contraseñas

El código heredado usa bcrypt con coste 12. Alta: mínimo 6 caracteres; cambio:
mínimo 8. El script nuevo de administrador exige 16 caracteres y máximo 72 bytes
UTF-8. Estas diferencias se documentan; no representan una política uniforme.

No se incluye una contraseña predeterminada. Si existía el administrador del SQL
original, rotarlo explícitamente. Endurecer validación y añadir revocación de sesiones
como cambio coordinado con frontend, backend y usuarios existentes.
