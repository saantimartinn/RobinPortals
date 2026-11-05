# Mentoría y conversión a cliente

Esta regla pertenece al **Portal del Alumno**. Una cuenta de Mentoría paga una sola
cuota de **666,33 €**. Tras registrar ese pago, un administrador puede convertir la
cuenta a **General, Delft o Llegada** desde su ficha o desde la lista de clientes.
Robin Jr no ofrece esta conversión.

## Importes

El pago real de Mentoría se descuenta de la **primera cuota** del nuevo programa.
El resto de cuotas conserva el calendario del programa elegido.

| Destino | Primera cuota ordinaria | Crédito de Mentoría | Primera cuota pendiente |
|---|---:|---:|---:|
| General estándar | 666,33 € | 666,33 € | 0 € |
| Delft | 999 € | 666,33 € | 332,67 € |
| Llegada | 850 € | 666,33 € | 183,67 € |
| General internacional de 2.700 € | 900 € | 666,33 € | 233,67 € |

La regla de origen internacional se calcula en
[`shared/financial-config.cjs`](../shared/financial-config.cjs). El importe no se
decide en React. Las cuotas posteriores de General dependen además del número de
carreras del expediente.

## Secuencia

1. El asesor abre una cuenta de Mentoría asignada y pulsa **Convertir a cliente**.
   La acción queda deshabilitada hasta que `users.pago_completed` sea verdadero.
2. La Function `POST /api/admin/clients/convert-mentoria` comprueba sesión, acceso al
   Portal del Alumno, rol administrador y asignación. Un administrador desarrollador
   puede operar sobre cualquier expediente de este portal.
3. La función SQL `convert_paid_mentoria_client` bloquea las filas y exige que la
   primera cuota de Mentoría esté pagada, sea de 666,33 € y no esté anulada.
   Rechaza una segunda conversión.
4. La misma transacción conserva el pago y su número de factura como fila histórica
   adicional (`installment >= 4`), con `payment_data.mentoria_credit_source=true`.
   Guarda la versión anterior del contrato en `contract_data.previous_contracts`,
   añade `contract_data.mentoria_upgrade` y cambia `users.tipo` al destino.
5. El alumno debe firmar el contrato del nuevo programa. Conserva los pasos de DNI
   y perfil ya completados. La vista previa, el PDF y el pago muestran el crédito.
   La firma anterior permanece en Storage y el PDF nuevo usa otro nombre en Drive.
6. En General estándar la primera cuota queda cubierta al firmar: se registra a
   **0 €** como cubierta por Mentoría, sin checkout ni segunda factura. En los otros
   destinos el alumno paga únicamente la diferencia de la primera cuota.

El pago histórico de Mentoría no se puede eliminar desde la interfaz ni desde el
endpoint de borrado de pagos extra. Holded omite facturas de cuotas de 0 €; la factura
original de Mentoría conserva su referencia. El nuevo primer cobro, si existe, usa
un identificador de cuota `U01` para no reutilizar la referencia histórica `01`.

## Fuentes y mantenimiento

- Importes y crédito: [`shared/financial-config.cjs`](../shared/financial-config.cjs).
- Texto del contrato: [`shared/contract-content.cjs`](../shared/contract-content.cjs).
- Ruta y autorización: [`admin-client-convert-mentoria.js`](../netlify/functions/admin-client-convert-mentoria.js).
- Transacción: [`202611050003_convert_paid_mentoria_client.sql`](../supabase/migrations/202611050003_convert_paid_mentoria_client.sql).
- Firma y paso cubierto: [`onboarding-contract.js`](../netlify/functions/onboarding-contract.js).
- Materialización e historial de cuotas: [`payments.js`](../lib/payments.js).

La migración concede ejecución solo a `service_role`. Debe estar aplicada en cada
entorno de Supabase antes de desplegar la ruta. No modifica cuentas al instalarse:
solo actúa cuando un administrador solicita una conversión. Para verificar el cambio,
probar los cuatro importes anteriores, la conservación del pago y el contrato, y el
caso General con primera cuota de 0 €.
