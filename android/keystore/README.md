# Keystore CI (sideload)

`pingo-ci.jks` firma todos los APKs de Actions con la misma clave, para que las actualizaciones puedan sobrescribir la instalación anterior.

No es un secreto de Play Store; está pensado para fiestas / sideload. Si quieres rotar la firma, genera otro JKS, reemplaza el archivo y pide a la gente que reinstale una vez.
