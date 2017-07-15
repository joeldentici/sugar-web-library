curl --header "content-type: application/json" --header "Authorization: Bearer $1" -X POST --data '{"type": "'"$2"'"}' localhost:7842/api/doStuff -i
echo ""
echo "DONE"
