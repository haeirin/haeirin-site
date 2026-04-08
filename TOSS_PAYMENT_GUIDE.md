# 토스페이먼츠 카드결제 연동 가이드

## 🚨 중요: 정적 웹사이트의 한계

**이 프로젝트는 순수 HTML/CSS/JavaScript 정적 웹사이트**이므로, 토스페이먼츠 카드결제를 **완전히 구현하는 것은 불가능**합니다.

### 왜 불가능한가?

토스페이먼츠 결제는 다음 단계를 거칩니다:

1. ✅ **클라이언트(브라우저)**: 결제 창 호출 → 고객이 카드 정보 입력 → 결제 승인 요청
2. ❌ **서버(백엔드)**: 토스페이먼츠 API로 **결제 승인** 요청 (Secret Key 필요)
3. ❌ **서버**: 결제 성공 여부 검증 후 주문 완료 처리

**문제점**:
- **Secret Key를 브라우저에 노출할 수 없음** (보안 위험)
- **서버사이드 코드 실행 불가** (Node.js, Python 등)
- 정적 웹사이트는 **클라이언트 코드만 실행 가능**

---

## 💡 해결 방안 (3가지)

### 방안 1: 외부 서버리스 플랫폼 사용 ⭐ 권장

**Vercel, Netlify, Cloudflare Workers** 등의 서버리스 함수를 이용:

1. 정적 웹사이트는 그대로 두고
2. **결제 승인 처리만 서버리스 함수**로 작성
3. 브라우저 → 서버리스 함수 → 토스페이먼츠 API 호출

**예시 (Vercel Functions - Node.js)**:

```javascript
// api/toss-confirm.js (Vercel 서버리스 함수)
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { paymentKey, orderId, amount } = req.body;
  const secretKey = process.env.TOSS_SECRET_KEY; // 환경변수로 관리

  try {
    const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ paymentKey, orderId, amount })
    });

    const result = await response.json();
    
    if (response.ok) {
      // ✅ 결제 성공 → 주문 DB 업데이트
      res.status(200).json({ success: true, data: result });
    } else {
      res.status(400).json({ success: false, error: result });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
```

**클라이언트 코드 (checkout.html)**:

```javascript
// 토스페이먼츠 결제 위젯 초기화
const clientKey = 'test_ck_...'; // 클라이언트 키 (공개 가능)
const tossPayments = TossPayments(clientKey);

// 결제 요청
async function requestPayment() {
  const orderId = generateOrderId();
  const amount = calculateTotalAmount();

  await tossPayments.requestPayment('카드', {
    amount: amount,
    orderId: orderId,
    orderName: '상품명',
    customerName: '홍길동',
    successUrl: window.location.origin + '/payment-success.html',
    failUrl: window.location.origin + '/payment-fail.html',
  });
}

// payment-success.html에서 실행
async function confirmPayment() {
  const urlParams = new URLSearchParams(window.location.search);
  const paymentKey = urlParams.get('paymentKey');
  const orderId = urlParams.get('orderId');
  const amount = urlParams.get('amount');

  // ★ 서버리스 함수 호출
  const response = await fetch('/api/toss-confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentKey, orderId, amount })
  });

  const result = await response.json();
  if (result.success) {
    alert('결제 성공!');
    // 주문 완료 페이지로 이동
  } else {
    alert('결제 실패: ' + result.error.message);
  }
}
```

---

### 방안 2: 토스페이먼츠 결제창 연동 (간단 버전)

**결제 승인 없이** 결제창만 띄우고, **가상으로 처리**:
- 고객이 결제창에서 카드 정보 입력
- 성공 URL로 리다이렉트 → "결제 대기" 상태로 DB 저장
- **실제 승인은 수동으로 관리자가 확인**

⚠️ **문제점**: 실제 결제는 이루어지지 않고, 결제 시도만 기록됨

---

### 방안 3: 무통장 입금 유지 + 추후 서버 구축

현재 구현된 **무통장 입금** 방식을 유지하고,
추후 **Node.js/Python 백엔드 서버**를 구축할 때 카드결제 추가

---

## 📋 토스페이먼츠 연동 체크리스트

### 1. 토스페이먼츠 가입 및 키 발급
1. [토스페이먼츠 개발자센터](https://developers.tosspayments.com/) 회원가입
2. **테스트 키** 발급:
   - 클라이언트 키 (Client Key): `test_ck_...` → 브라우저 노출 가능
   - 시크릿 키 (Secret Key): `test_sk_...` → **서버에서만 사용**

### 2. 결제 위젯 SDK 추가
```html
<script src="https://js.tosspayments.com/v1/payment-widget"></script>
```

### 3. 결제 프로세스 구현
- [ ] 결제 요청 버튼 추가 (checkout.html)
- [ ] 결제 성공 페이지 (payment-success.html)
- [ ] 결제 실패 페이지 (payment-fail.html)
- [ ] 서버리스 함수 작성 (Vercel/Netlify)
- [ ] 결제 승인 API 호출 (서버리스 함수에서)
- [ ] 주문 DB 업데이트 (결제 완료 시)

### 4. 테스트
- 테스트 카드 번호: `4242-4242-4242-4242`
- CVC: 아무 3자리 숫자
- 유효기간: 미래 날짜

---

## 🔗 참고 문서

- [토스페이먼츠 공식 문서](https://docs.tosspayments.com/)
- [결제위젯 연동 가이드](https://docs.tosspayments.com/guides/payment-widget/overview)
- [Vercel Functions 가이드](https://vercel.com/docs/functions)
- [Netlify Functions 가이드](https://docs.netlify.com/functions/overview/)

---

## 🎯 결론

**현재 프로젝트에서 완전한 카드결제 구현은 불가능**합니다.

**권장 방안**:
1. **Vercel/Netlify 서버리스 함수**를 이용한 결제 승인 처리
2. 또는 **백엔드 서버**(Node.js, Express 등) 별도 구축

**간단히 시도해보려면**:
- 방안 2처럼 결제창만 띄우고 실제 승인은 스킵 (데모용)
- 실제 운영 시에는 반드시 서버 구축 필요

---

**추가 질문이나 구체적인 구현을 원하시면 말씀해주세요!**
