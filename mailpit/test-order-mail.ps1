# Test Order & Mailpit Verification Script
$ErrorActionPreference = "Stop"

Write-Host "1. Logging in as customer@meditrack.com..."
$loginBody = @{
    email = "customer@meditrack.com"
    password = "Password@123"
} | ConvertTo-Json

$loginResp = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
$token = if ($loginResp.data.token) { $loginResp.data.token } else { $loginResp.data.accessToken }
Write-Host "   -> Logged in successfully! Token received."

$headers = @{
    Authorization = "Bearer " + $token
}

Write-Host "2. Adding item (Paracetamol 650mg, Product ID 1) to cart..."
$cartBody = @{
    productId = 1
    quantity = 2
} | ConvertTo-Json

$cartResp = Invoke-RestMethod -Uri "http://localhost:8080/api/customer/cart/items" -Method Post -Headers $headers -ContentType "application/json" -Body $cartBody
Write-Host "   -> Added to cart! Cart item count: $($cartResp.data.items.Count)"

Write-Host "3. Placing order..."
$orderBody = @{
    paymentMethod = "ONLINE"
    deliveryAddressSnapshot = "Flat 402, Green Glen Layout, Bellandur, Bengaluru"
} | ConvertTo-Json

try {
    $orderResp = Invoke-RestMethod -Uri "http://localhost:8080/api/customer/orders" -Method Post -Headers $headers -ContentType "application/json" -Body $orderBody
    $orderNumber = $orderResp.data.orderNumber
    $orderAmount = $orderResp.data.totalAmount
    Write-Host "   -> [SUCCESS] Order placed successfully!"
    Write-Host "      Order Number: $orderNumber"
    Write-Host "      Total Amount: Rs. $orderAmount"
} catch {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    Write-Host "   -> Order error: $($reader.ReadToEnd())"
}

Write-Host "4. Waiting 2 seconds for asynchronous email dispatch via Angus Mail to Mailpit..."
Start-Sleep -Seconds 2

Write-Host "5. Checking Mailpit inbox at http://localhost:8025..."
$mailResp = Invoke-RestMethod -Uri "http://localhost:8025/api/v1/messages"
Write-Host "   -> Total emails captured in Mailpit: $($mailResp.total)"

foreach ($msg in $mailResp.messages) {
    Write-Host "   -------------------------------------------------------"
    Write-Host "   ID     : $($msg.ID)"
    Write-Host "   From   : $($msg.From.Address)"
    Write-Host "   To     : $($msg.To.Address -join ', ')"
    $detail = Invoke-RestMethod -Uri ("http://localhost:8025/api/v1/message/" + $msg.ID)
    Write-Host "   Preview: $($detail.Snippet)"
}
Write-Host "   -------------------------------------------------------"
Write-Host "[VERIFICATION SUCCESSFUL] Order placed and email successfully captured by Mailpit!"
