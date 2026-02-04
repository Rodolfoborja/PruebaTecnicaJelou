const pool = require('../config/database');

const idempotencyMiddleware = async (req, res, next) => {
  const idempotencyKey = req.headers['x-idempotency-key'];
  
  if (!idempotencyKey) {
    return next();
  }

  try {
    const [existing] = await pool.execute(
      'SELECT * FROM idempotency_keys WHERE `key` = ?',
      [idempotencyKey]
    );

    if (existing.length > 0) {
      const record = existing[0];
      
      if (new Date() > new Date(record.expires_at)) {
        await pool.execute('DELETE FROM idempotency_keys WHERE `key` = ?', [idempotencyKey]);
        return next();
      }

      if (record.status === 'completed' && record.response_body) {
        const response = JSON.parse(record.response_body);
        return res.status(200).json(response);
      }

      return res.status(409).json({ error: 'Request is being processed' });
    }

    req.idempotencyKey = idempotencyKey;
    next();
  } catch (error) {
    next(error);
  }
};

async function saveIdempotencyKey(key, targetType, targetId, responseBody) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  await pool.execute(
    'INSERT INTO idempotency_keys (`key`, target_type, target_id, status, response_body, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
    [key, targetType, targetId, 'completed', JSON.stringify(responseBody), expiresAt]
  );
}

module.exports = { idempotencyMiddleware, saveIdempotencyKey };
