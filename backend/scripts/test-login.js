// Simple script to verify login works for given credentials
(async () => {
  try {
    const res = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@bt.com', password: 'manager123', userType: 'employee' })
    });
    const data = await res.json();
    console.log('status:', res.status);
    console.log('success:', data.success);
    console.log('message:', data.message);
    if (data?.data?.user) {
      console.log('user:', { employee_id: data.data.user.employee_id, role: data.data.user.role, email: data.data.user.email });
    }
  } catch (e) {
    console.error('Request failed:', e);
    process.exit(1);
  }
})();















