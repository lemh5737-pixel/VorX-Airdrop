export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // API ini tidak digunakan dalam implementasi final
    // Karena kita menggunakan XMLHttpRequest langsung dari klien
    // Tapi kita biarkan untuk kemungkinan penggunaan di masa depan
    
    res.status(200).json({ message: 'API endpoint ready' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
