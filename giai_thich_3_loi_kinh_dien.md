# 📘 TỔNG HỢP & GIẢI THÍCH CHUYÊN SÂU 3 LỖI KINH ĐIỂN (.NET & DOCKER CLOUD)

Tài liệu này tổng hợp nguyên nhân gốc rễ, cơ chế hoạt động và giải pháp triệt để cho 3 lỗi thường gặp nhất khi triển khai ứng dụng ASP.NET Core lên Docker / Render.

---

## 1. LỖI 1: `TypeLoadException: IDisableCookieRedirectMetadata`

### 🔴 Triệu chứng Log:
```text
System.TypeLoadException: Could not load type 'Microsoft.AspNetCore.Http.Metadata.IDisableCookieRedirectMetadata'
from assembly 'Microsoft.AspNetCore.Http.Abstractions, Version=10.0.0.0'
at Microsoft.AspNetCore.Http.Generated.<GeneratedRouteBuilderExtensions_g>...
```

### 🔍 Nguyên nhân kỹ thuật:
1. **Cơ chế Source Generator (RDG - Request Delegate Generator):**
   * Trong ASP.NET Core Minimal API, để đạt tốc độ thực thi tối đa mà không dùng Reflection, trình biên dịch tự động sinh mã C# ẩn (`<GeneratedRouteBuilderExtensions_g>.cs`) ngay trong lúc Build (Compile-time).
   * Mã này chứa các lời gọi gán Metadata bảo mật cho Endpoint, bao gồm `IDisableCookieRedirectMetadata`.
2. **Lệch pha nhị phân (Binary Incompatibility) ở bản Preview:**
   * Khi Docker kéo image `mcr.microsoft.com/dotnet/sdk:10.0-preview`, trình sinh mã của SDK .NET 10 Preview gọi tới interface `IDisableCookieRedirectMetadata`.
   * Tuy nhiên, file DLL runtime `Microsoft.AspNetCore.Http.Abstractions.dll` của bản Preview 7 trên Linux lại chưa kịp định nghĩa interface này.
   * Khi có request HTTP gọi tới $\rightarrow$ CLR (Runtime) tìm trong DLL không thấy $\rightarrow$ Quăng lỗi `TypeLoadException`.

### 🛠️ Giải pháp:
* Chuyển `TargetFramework` và Dockerfile sang **.NET 9.0 Official Stable** (`mcr.microsoft.com/dotnet/sdk:9.0` & `aspnet:9.0`). Bản Stable đã được đóng băng mã nguồn (API Freeze), không bao giờ bị lệch interface ngầm.

---

## 2. LỖI 2: `TypeLoadException: SetPropertyCalls<T>`

### 🔴 Triệu chứng Log:
```text
System.TypeLoadException: Could not load type 'Microsoft.EntityFrameworkCore.Query.SetPropertyCalls`1'
from assembly 'Microsoft.EntityFrameworkCore, Version=10.0.11.0'
```

### 🔍 Nguyên nhân kỹ thuật:
1. **Cơ chế của `ExecuteUpdateAsync` trong EF Core:**
   * Khi gọi `ExecuteUpdateAsync(setter => setter.SetProperty(c => c.Remaining, c => c.Quantity))`, EF Core phải phân tích cây biểu thức LINQ (Expression Tree) để dịch thành câu lệnh SQL `UPDATE`.
   * Quá trình này sử dụng class nội bộ `SetPropertyCalls<T>`.
2. **Xung đột phiên bản giữa Provider và Runtime:**
   * Driver PostgreSQL (`Npgsql.EntityFrameworkCore.PostgreSQL 9.x`) được biên dịch dựa trên EF Core 9.
   * Trên .NET 10 Preview, Microsoft đã tái cấu trúc (refactor) lại toàn bộ LINQ Query Parser của EF Core 10, làm thay đổi class này.
   * Npgsql gọi vào `.dll` của EF Core 10 không tìm thấy $\rightarrow$ Gây ra lỗi `TypeLoadException`.

### 🛠️ Giải pháp:
* **Cách 1 (Tốt nhất):** Dùng `ExecuteSqlRawAsync`:
  ```csharp
  await db.Database.ExecuteSqlRawAsync("UPDATE \"Cards\" SET \"Remaining\" = \"Quantity\";");
  ```
  *(Bỏ qua hoàn toàn cây phân tích LINQ của EF Core, gửi lệnh SQL trực tiếp xuống PostgreSQL $\rightarrow$ Không bao giờ bị lỗi).*
* **Cách 2:** Đồng bộ toàn bộ project và thư viện về cùng phiên bản .NET 9.0 Stable.

---

## 3. LỖI 3: `IOException: inotify instances limit (128) reached`

### 🔴 Triệu chứng Log:
```text
System.IO.IOException: The configured user limit (128) on the number of inotify instances has been reached...
at System.IO.FileSystemWatcher.StartRaisingEvents()
==> Exited with status 139
```

### 🔍 Nguyên nhân kỹ thuật:
1. **Cơ chế `inotify` trong Linux Kernel:**
   * `inotify` (inode notify) là tính năng của Linux cho phép ứng dụng đăng ký nhận sự kiện khi file bị chỉnh sửa.
   * Linux giới hạn mỗi user chỉ được mở tối đa 128 kênh (`fs.inotify.max_user_instances = 128`) để chống cạn kiệt tài nguyên.
2. **Cơ chế `reloadOnChange` của .NET:**
   * Mặc định khi khởi động (`WebApplication.CreateBuilder`), .NET tự động mở `FileSystemWatcher` (dùng `inotify`) để theo dõi các file `appsettings.json`, `appsettings.Production.json`, logging configs...
   * Trên môi trường Container chia sẻ tài nguyên (như Render Free Tier), hạn mức 128 này đã bị các tiến trình khác dùng hết $\rightarrow$ .NET xin mở thêm bị Linux từ chối $\rightarrow$ Crash ứng dụng ngay khi khởi động (Exit status 139).

### 🛠️ Giải pháp:
* Thêm biến môi trường vào Dockerfile để yêu cầu .NET dùng cơ chế Polling nhẹ nhàng thay vì `inotify`:
  ```dockerfile
  ENV DOTNET_USE_POLLING_FILE_WATCHER=true
  ```

---

## 4. LỖI 4: `SocketException (111): Connection refused (127.0.0.1:5432)`

### 🔴 Triệu chứng Log:
```text
Npgsql.NpgsqlException: Failed to connect to 127.0.0.1:5432
---> System.Net.Sockets.SocketException (111): Connection refused
An error occurred using the connection to database 'CardGachaDb' on server 'tcp://localhost:5432'.
```

### 🔍 Nguyên nhân kỹ thuật:
1. Trong file cấu hình mặc định `appsettings.json`, chuỗi kết nối đang trỏ về máy cá nhân:
   ```json
   "ConnectionStrings": {
     "CardDb": "Host=localhost;Port=5432;Database=CardGachaDb;..."
   }
   ```
2. Khi ứng dụng chạy trong Container trên Render, **`localhost` (127.0.0.1) chính là bản thân Container đó**.
3. Bên trong Container của API **hoàn toàn không có phần mềm PostgreSQL nào đang chạy** ở cổng 5432 $\rightarrow$ Linux phản hồi ngay lập tức mã lỗi `111 Connection refused` (Từ chối kết nối vì không có dịch vụ nào mở cổng 5432).

### 🛠️ Giải pháp:
1. Tạo một cơ sở dữ liệu **PostgreSQL** trên Render (**New +** $\rightarrow$ **PostgreSQL**).
2. Lấy chuỗi kết nối **Internal Database URL** (hoặc Connection String do Render cấp).
3. Vào Web Service trên Render $\rightarrow$ Tab **Environment** $\rightarrow$ Thêm biến môi trường:
   * **Key**: `ConnectionStrings__CardDb`
   * **Value**: `<Chuỗi_kết_nối_PostgreSQL_của_Render>`
4. Ứng dụng .NET sẽ tự động đọc biến môi trường này để kết nối tới database thật trên đám mây thay vì `localhost:5432`.
