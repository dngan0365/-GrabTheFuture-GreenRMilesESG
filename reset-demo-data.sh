docker exec -it carbon_postgres psql -U postgres -d carbon_db -c \
    "TRUNCATE companies, departments, users, rides, reward_redemptions, prediction_logs, recommendation_logs RESTART IDENTITY CASCADE;"

docker exec -i carbon_postgres psql -U postgres -d carbon_db < db/04-demo-data.sql

docker exec -it carbon_postgres psql -U postgres -d carbon_db -c \
"SELECT (SELECT count(*) FROM users) AS users, (SELECT count(*) FROM rides) AS rides;"
