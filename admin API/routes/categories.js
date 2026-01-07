const express = require('express');
const AV = require('leancloud-storage');

const router = express.Router();

// 获取所有分类
router.get('/', async (req, res) => {
  try {
    const query = new AV.Query('Category');
    query.ascending('sortOrder');
    const categories = await query.find();

    const categoryData = categories.map(cat => ({
      id: cat.id,
      name: cat.get('name'),
      nameCn: cat.get('nameCn'),
      sortOrder: cat.get('sortOrder')
    }));

    res.json({
      success: true,
      data: categoryData
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get categories'
    });
  }
});

module.exports = router;
