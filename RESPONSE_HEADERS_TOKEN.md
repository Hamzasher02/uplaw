# Response Headers Token Documentation

## 🎯 Implementation Overview

When a mobile app (`x-client-type: app`) makes login/verify-otp/refresh-token requests:
- Tokens are sent **ONLY in Response HEADERS** ✅
- Tokens are **NOT in Response BODY** ❌

### Changes Made:
- `app.js`: Added `exposedHeaders: ['Authorization', 'x-refresh-token']` to CORS config
- `auth.controller.js`: Tokens removed from body for app clients

---

## 📤 Response Headers (App Clients Only)

When request has `x-client-type: app` header:

| Response Header | Format | Example |
|-----------------|--------|---------|
| `Authorization` | `Bearer <accessToken>` | `Bearer eyJhbGciOiJIUzI1NiIs...` |
| `x-refresh-token` | `<refreshToken>` | `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5...` |

---

## 🧪 Test with cURL

```bash
# Login and get tokens from headers
curl -i -X POST http://localhost:3000/api/v1/auth/login/client \
  -H "Content-Type: application/json" \
  -H "x-client-type: app" \
  -d '{"identifier": "client@test.com", "password": "password123"}'

# Response Headers will include:
# Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# x-refresh-token: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6...
```

---

## 🧪 Test with Postman

### Request:
```
POST {{baseUrl}}/auth/login/client
Headers:
  Content-Type: application/json
  x-client-type: app
Body:
{
  "identifier": "client@test.com",
  "password": "password123"
}
```

### Extract Headers in Tests Tab:
```javascript
// Postman Test Script - extract from headers
var authHeader = pm.response.headers.get('Authorization');
var refreshHeader = pm.response.headers.get('x-refresh-token');

if (authHeader) {
    pm.collectionVariables.set('accessToken', authHeader.replace('Bearer ', ''));
}
if (refreshHeader) {
    pm.collectionVariables.set('refreshToken', refreshHeader);
}

console.log('Access Token from Header:', authHeader);
console.log('Refresh Token from Header:', refreshHeader);
```

---

## 📱 Flutter/Dio Implementation

```dart
import 'package:dio/dio.dart';

class AuthService {
  final Dio _dio = Dio();
  
  Future<void> login(String email, String password) async {
    try {
      final response = await _dio.post(
        'http://localhost:3000/api/v1/auth/login/client',
        data: {
          'identifier': email,
          'password': password,
        },
        options: Options(
          headers: {
            'Content-Type': 'application/json',
            'x-client-type': 'app',  // Required for header tokens
          },
        ),
      );
      
      // ✅ Method 1: Extract from HEADERS (New!)
      final authHeader = response.headers.value('Authorization');
      final refreshHeader = response.headers.value('x-refresh-token');
      
      if (authHeader != null) {
        final accessToken = authHeader.replaceFirst('Bearer ', '');
        print('Access Token from Header: $accessToken');
        await saveAccessToken(accessToken);
      }
      
      if (refreshHeader != null) {
        print('Refresh Token from Header: $refreshHeader');
        await saveRefreshToken(refreshHeader);
      }
      
      // ✅ Method 2: Extract from BODY (Backward Compatible)
      final data = response.data[0]['data'];
      final bodyAccessToken = data['accessToken'];
      final bodyRefreshToken = data['refreshToken'];
      
      print('Access Token from Body: $bodyAccessToken');
      print('Refresh Token from Body: $bodyRefreshToken');
      
    } catch (e) {
      print('Login error: $e');
      rethrow;
    }
  }
  
  Future<void> saveAccessToken(String token) async {
    // Save to SharedPreferences or secure storage
  }
  
  Future<void> saveRefreshToken(String token) async {
    // Save to FlutterSecureStorage
  }
}
```

---

## 🔄 Updated API Endpoints

### Endpoints that now send headers (for app clients):

| Endpoint | Method | Headers Sent |
|----------|--------|--------------|
| `/auth/login/client` | POST | ✅ Authorization, x-refresh-token |
| `/auth/login/lawyer` | POST | ✅ Authorization, x-refresh-token |
| `/auth/verify-otp` | POST | ✅ Authorization, x-refresh-token |
| `/auth/refresh-token` | POST | ✅ Authorization, x-refresh-token |

---

## ✅ Backward Compatibility

- Response body format unchanged: `[{ success, message, data }]`
- Tokens still available in body for existing implementations
- Web flow (cookie-based refresh token) unaffected
- Only app clients (`x-client-type: app`) get header tokens
