# Lần đầu (hoặc sau khi sửa SQL)
docker compose down -v        # xóa volume cũ để init chạy lại
docker compose up -d          # tạo lại từ đầu

# Kiểm tra đã load đúng chưa
docker exec -it carbon_postgres psql -U postgres -d carbon_db -c "\dt"

# Xem log nếu có lỗi
docker compose logs postgres