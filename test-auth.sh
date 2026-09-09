#!/usr/bin/env bash
# Verificación de la autenticación del Open Challenge.
#
# Uso:
#   npm run dev          (en otra terminal)
#   bash test-auth.sh
#
# No depende de nada que haya escrito Claude Code: comprueba el contrato
# definido en API.md. Si algo falla, el fallo es real.

set -u
B="${1:-http://localhost:3000}"
J="$(mktemp)"
MAIL="test.$(date +%s)@univ-lehavre.fr"
PASS="challenge2026"
NEWPASS="nouveaupass2026"
ok=0; ko=0

c() {  # c <esperado> <descripción> <curl args...>
  local want="$1"; local what="$2"; shift 2
  local body code
  body="$(curl -s -w $'\n%{http_code}' "$@")"
  code="$(printf '%s' "$body" | tail -n1)"
  BODY="$(printf '%s' "$body" | sed '$d')"
  if [ "$code" = "$want" ]; then
    printf '  \033[32mOK\033[0m   %-52s %s\n' "$what" "$code"; ok=$((ok+1))
  else
    printf '  \033[31mFALLO\033[0m %-52s %s (esperaba %s)\n' "$what" "$code" "$want"
    printf '        respuesta: %s\n' "$(printf '%s' "$BODY" | head -c 200)"; ko=$((ko+1))
  fi
}

json='Content-Type: application/json'
reg() { printf '{"name":"%s","email":"%s","password":"%s","lab":"LITIS","disc":["info","donnees"],"bio":"Test","visible":true}' "$1" "$2" "$3"; }

echo
echo "Servidor: $B"
echo
echo "1. Inscripción y sesión"
c 201 "registro nuevo" -c "$J" -X POST "$B/api/auth/register" -H "$json" -d "$(reg 'Alice Durand' "$MAIL" "$PASS")"
c 200 "GET /api/me con la cookie" -b "$J" "$B/api/me"
ME="$BODY"
c 409 "mismo correo otra vez" -X POST "$B/api/auth/register" -H "$json" -d "$(reg 'Alice Durand' "$MAIL" "$PASS")"
c 400 "nombre de una sola palabra" -X POST "$B/api/auth/register" -H "$json" -d "$(reg 'Alice' "otro.$MAIL" "$PASS")"
c 400 "contraseña de 4 caracteres" -X POST "$B/api/auth/register" -H "$json" -d "$(reg 'Bob Martin' "corta.$MAIL" 'abcd')"

echo
echo "2. Aviso de homónimo (no debe bloquear)"
c 201 "mismo nombre, correo distinto" -X POST "$B/api/auth/register" -H "$json" -d "$(reg 'Alice Durand' "homonyme.$MAIL" "$PASS")"
if printf '%s' "$BODY" | grep -qi 'homonym'; then
  printf '  \033[32mOK\033[0m   %-52s\n' "devuelve homonymWarning"; ok=$((ok+1))
else
  printf '  \033[31mFALLO\033[0m %-52s\n' "falta homonymWarning en la respuesta"; ko=$((ko+1))
fi

echo
echo "3. Login"
c 401 "contraseña incorrecta" -X POST "$B/api/auth/login" -H "$json" -d "{\"email\":\"$MAIL\",\"password\":\"mauvais\"}"
M1="$BODY"
c 401 "correo inexistente" -X POST "$B/api/auth/login" -H "$json" -d '{"email":"personne.inconnue@univ-lehavre.fr","password":"mauvais"}'
M2="$BODY"
if [ "$M1" = "$M2" ]; then
  printf '  \033[32mOK\033[0m   %-52s\n' "mismo mensaje en los dos casos"; ok=$((ok+1))
else
  printf '  \033[31mFALLO\033[0m %-52s\n' "mensajes distintos: revela quién está inscrito"; ko=$((ko+1))
  echo "        $M1"; echo "        $M2"
fi
c 200 "login correcto" -c "$J" -X POST "$B/api/auth/login" -H "$json" -d "{\"email\":\"$MAIL\",\"password\":\"$PASS\"}"

echo
echo "4. Cookie"
if grep -qi 'oc_session\|session' "$J"; then
  printf '  \033[32mOK\033[0m   %-52s\n' "la cookie de sesión está en el tarro"; ok=$((ok+1))
else
  printf '  \033[31mFALLO\033[0m %-52s\n' "no hay cookie de sesión"; ko=$((ko+1))
fi
if grep -qi 'HttpOnly\|#HttpOnly' "$J"; then
  printf '  \033[32mOK\033[0m   %-52s\n' "la cookie es HttpOnly"; ok=$((ok+1))
else
  printf '  \033[31mFALLO\033[0m %-52s\n' "la cookie NO es HttpOnly"; ko=$((ko+1))
fi

echo
echo "5. Fuga de datos sensibles"
for campo in passwordHash password resetToken; do
  if printf '%s' "$ME" | grep -q "\"$campo\""; then
    printf '  \033[31mFALLO\033[0m %-52s\n' "/api/me devuelve $campo"; ko=$((ko+1))
  else
    printf '  \033[32mOK\033[0m   %-52s\n' "$campo no sale en /api/me"; ok=$((ok+1))
  fi
done

echo
echo "6. Logout"
curl -s -b "$J" -c "$J" -X POST "$B/api/auth/logout" >/dev/null
c 401 "GET /api/me después del logout" -b "$J" "$B/api/me"

echo
echo "7. Olvido de contraseña"
c 200 "correo inscrito" -X POST "$B/api/auth/forgot" -H "$json" -d "{\"email\":\"$MAIL\"}"
c 200 "correo inexistente (mismo 200)" -X POST "$B/api/auth/forgot" -H "$json" -d '{"email":"personne.inconnue@univ-lehavre.fr"}'
c 400 "reset con un token inventado" -X POST "$B/api/auth/reset" -H "$json" -d '{"token":"faux-token","password":"nouveaupass2026"}'

echo
echo "8. Desafíos sembrados"
c 200 "GET /api/challenges" "$B/api/challenges"
N="$(printf '%s' "$BODY" | grep -o '"ref"' | wc -l | tr -d ' ')"
if [ "$N" = "7" ]; then
  printf '  \033[32mOK\033[0m   %-52s %s\n' "hay 7 desafíos" "$N"; ok=$((ok+1))
else
  printf '  \033[31mFALLO\033[0m %-52s %s\n' "número de desafíos" "$N"; ko=$((ko+1))
fi

rm -f "$J"
echo
echo "-----------------------------------------------"
printf 'Correctos: %s   Fallos: %s\n' "$ok" "$ko"
echo "-----------------------------------------------"
echo
echo "El reset con token real hay que probarlo a mano:"
echo "  1. lanza el forgot de arriba"
echo "  2. copia el token del enlace que aparece en la consola de npm run dev"
echo "  3. curl -X POST $B/api/auth/reset -H '$json' \\"
echo "       -d '{\"token\":\"PEGA_EL_TOKEN\",\"password\":\"$NEWPASS\"}'"
echo "  4. vuelve a hacer login con la contraseña nueva"
echo "  5. repite el paso 3 con el mismo token: debe fallar (un solo uso)"
echo
[ "$ko" = "0" ] || exit 1
