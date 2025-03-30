const express = require('express');
const router = express.Router();
const purchaseOrderController = require('../service/purchaseOrderService');
const { logger } = require('../util/logger');

/**
 * @route   GET /api/purchaseOrder
 * @desc    Get all purchase orders
 * @access  Private
 */
router.get('/', async (req, res, next) => {
  try {
    logger.info('Fetching all purchase orders');
    const purchaseOrders = await purchaseOrderController.getAllPurchaseOrders();
    res.status(200).json(purchaseOrders);
  } catch (error) {
    logger.error(`Error fetching purchase orders: ${error.message}`);
    next(error);
  }
});

/**
 * @route   GET /api/purchaseOrder/:id
 * @desc    Get purchase order by ID
 * @access  Private
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    logger.info(`Fetching purchase order with ID: ${id}`);
    const purchaseOrder = await purchaseOrderController.getPurchaseOrderById(id);
    
    if (!purchaseOrder) {
      return res.status(404).json({ 
        status: 'error', 
        message: `Purchase order with ID ${id} not found` 
      });
    }
    
    res.status(200).json(purchaseOrder);
  } catch (error) {
    logger.error(`Error fetching purchase order: ${error.message}`);
    next(error);
  }
});

/**
 * @route   POST /api/purchaseOrder
 * @desc    Create a new purchase order
 * @access  Private
 */
router.post('/', async (req, res, next) => {
  try {
    const purchaseOrderData = req.body;
    logger.info('Creating new purchase order');
    const newPurchaseOrder = await purchaseOrderController.createPurchaseOrder(purchaseOrderData);
    res.status(201).json(newPurchaseOrder);
  } catch (error) {
    logger.error(`Error creating purchase order: ${error.message}`);
    next(error);
  }
});

/**
 * @route   PUT /api/purchaseOrder/:id
 * @desc    Update a purchase order
 * @access  Private
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    logger.info(`Updating purchase order with ID: ${id}`);
    const updatedPurchaseOrder = await purchaseOrderController.updatePurchaseOrder(id, updateData);
    
    if (!updatedPurchaseOrder) {
      return res.status(404).json({ 
        status: 'error', 
        message: `Purchase order with ID ${id} not found` 
      });
    }
    
    res.status(200).json(updatedPurchaseOrder);
  } catch (error) {
    logger.error(`Error updating purchase order: ${error.message}`);
    next(error);
  }
});

/**
 * @route   DELETE /api/purchaseOrder/:id
 * @desc    Delete a purchase order
 * @access  Private
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    logger.info(`Deleting purchase order with ID: ${id}`);
    const result = await purchaseOrderController.deletePurchaseOrder(id);
    
    if (!result) {
      return res.status(404).json({ 
        status: 'error', 
        message: `Purchase order with ID ${id} not found` 
      });
    }
    
    res.status(200).json({ 
      status: 'success', 
      message: `Purchase order with ID ${id} successfully deleted` 
    });
  } catch (error) {
    logger.error(`Error deleting purchase order: ${error.message}`);
    next(error);
  }
});

module.exports = router; 