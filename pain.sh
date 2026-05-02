CLIENT_ID=""
CLIENT_SECRET=""
CODE=""
REDIRECT_URI="https://homeharmonyhub.hu/auth/external/callback"
BASIC="$(printf '%s' "${CLIENT_ID}:${CLIENT_SECRET}" | base64 | tr -d '\r\n')"

curl -v --http1.1 -X POST "https://accounts.spotify.com/api/token" \
  -H "Authorization: Basic ${BASIC}" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Accept: application/json" \
  --data-urlencode "grant_type=authorization_code" \
  --data-urlencode "code=${CODE}" \
  --data-urlencode "redirect_uri=${REDIRECT_URI}"