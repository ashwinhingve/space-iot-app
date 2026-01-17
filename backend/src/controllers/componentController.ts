import { Request, Response } from 'express';
import { Component } from '../models/Component';
import { Manifold } from '../models/Manifold';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a new component
 *
 * @route POST /api/components
 * @access Private
 */
export const createComponent = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      manifoldId,
      componentType,
      specifications,
      position,
      maintenance
    } = req.body;

    // Validation
    if (!manifoldId || !componentType || !position) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Manifold ID, component type, and position are required'
      });
      return;
    }

    // Check if manifold exists and belongs to user
    const manifold = await Manifold.findOne({
      _id: manifoldId,
      owner: req.user._id
    });

    if (!manifold) {
      res.status(404).json({
        error: 'MANIFOLD_NOT_FOUND',
        message: 'Manifold not found or you do not have access'
      });
      return;
    }

    const component = new Component({
      componentId: `${manifold.manifoldId}-${componentType.replace(/\s+/g, '')}-${uuidv4().slice(0, 4).toUpperCase()}`,
      manifoldId,
      componentType,
      specifications: specifications || {},
      position,
      maintenance: maintenance || {}
    });

    await component.save();

    res.status(201).json({
      success: true,
      message: 'Component created successfully',
      component
    });
  } catch (error: any) {
    console.error('Error creating component:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Error creating component'
    });
  }
};

/**
 * Get single component
 *
 * @route GET /api/components/:id
 * @access Private
 */
export const getComponent = async (req: Request, res: Response): Promise<void> => {
  try {
    const component = await Component.findById(req.params.id).populate('manifoldId', 'name manifoldId');

    if (!component) {
      res.status(404).json({
        error: 'COMPONENT_NOT_FOUND',
        message: 'Component not found'
      });
      return;
    }

    // Verify ownership via manifold
    const manifold = await Manifold.findOne({
      _id: component.manifoldId,
      owner: req.user._id
    });

    if (!manifold) {
      res.status(403).json({
        error: 'UNAUTHORIZED',
        message: 'You do not have access to this component'
      });
      return;
    }

    res.json({
      success: true,
      component
    });
  } catch (error: any) {
    console.error('Error fetching component:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Error fetching component'
    });
  }
};

/**
 * Update component
 *
 * @route PUT /api/components/:id
 * @access Private
 */
export const updateComponent = async (req: Request, res: Response): Promise<void> => {
  try {
    const component = await Component.findById(req.params.id);

    if (!component) {
      res.status(404).json({
        error: 'COMPONENT_NOT_FOUND',
        message: 'Component not found'
      });
      return;
    }

    // Verify ownership via manifold
    const manifold = await Manifold.findOne({
      _id: component.manifoldId,
      owner: req.user._id
    });

    if (!manifold) {
      res.status(403).json({
        error: 'UNAUTHORIZED',
        message: 'You do not have access to this component'
      });
      return;
    }

    const {
      componentType,
      specifications,
      position,
      maintenance
    } = req.body;

    // Update fields
    if (componentType) component.componentType = componentType;
    if (specifications) {
      component.specifications = { ...component.specifications, ...specifications };
    }
    if (position) {
      component.position = { ...component.position, ...position };
    }
    if (maintenance) {
      component.maintenance = { ...component.maintenance, ...maintenance };
    }

    await component.save();

    res.json({
      success: true,
      message: 'Component updated successfully',
      component
    });
  } catch (error: any) {
    console.error('Error updating component:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Error updating component'
    });
  }
};

/**
 * Delete component
 *
 * @route DELETE /api/components/:id
 * @access Private
 */
export const deleteComponent = async (req: Request, res: Response): Promise<void> => {
  try {
    const component = await Component.findById(req.params.id);

    if (!component) {
      res.status(404).json({
        error: 'COMPONENT_NOT_FOUND',
        message: 'Component not found'
      });
      return;
    }

    // Verify ownership via manifold
    const manifold = await Manifold.findOne({
      _id: component.manifoldId,
      owner: req.user._id
    });

    if (!manifold) {
      res.status(403).json({
        error: 'UNAUTHORIZED',
        message: 'You do not have access to this component'
      });
      return;
    }

    await Component.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Component deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting component:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Error deleting component'
    });
  }
};

/**
 * Add maintenance record
 *
 * @route POST /api/components/:id/maintenance
 * @access Private
 */
export const addMaintenanceRecord = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      date,
      technician,
      workPerformed,
      partsReplaced,
      cost,
      notes
    } = req.body;

    // Validation
    if (!date) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Maintenance date is required'
      });
      return;
    }

    const component = await Component.findById(req.params.id);

    if (!component) {
      res.status(404).json({
        error: 'COMPONENT_NOT_FOUND',
        message: 'Component not found'
      });
      return;
    }

    // Verify ownership via manifold
    const manifold = await Manifold.findOne({
      _id: component.manifoldId,
      owner: req.user._id
    });

    if (!manifold) {
      res.status(403).json({
        error: 'UNAUTHORIZED',
        message: 'You do not have access to this component'
      });
      return;
    }

    const maintenanceRecord = {
      date: new Date(date),
      technician: technician || '',
      workPerformed: workPerformed || '',
      partsReplaced: partsReplaced || [],
      cost: cost || 0,
      notes: notes || ''
    };

    component.maintenance.history.push(maintenanceRecord);

    // Update last service date
    component.maintenance.lastServiceDate = new Date(date);

    await component.save();

    res.status(201).json({
      success: true,
      message: 'Maintenance record added successfully',
      maintenanceRecord
    });
  } catch (error: any) {
    console.error('Error adding maintenance record:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Error adding maintenance record'
    });
  }
};

/**
 * Get maintenance history
 *
 * @route GET /api/components/:id/maintenance
 * @access Private
 */
export const getMaintenanceHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const component = await Component.findById(req.params.id);

    if (!component) {
      res.status(404).json({
        error: 'COMPONENT_NOT_FOUND',
        message: 'Component not found'
      });
      return;
    }

    // Verify ownership via manifold
    const manifold = await Manifold.findOne({
      _id: component.manifoldId,
      owner: req.user._id
    });

    if (!manifold) {
      res.status(403).json({
        error: 'UNAUTHORIZED',
        message: 'You do not have access to this component'
      });
      return;
    }

    res.json({
      success: true,
      maintenance: {
        lastServiceDate: component.maintenance.lastServiceDate,
        nextServiceDate: component.maintenance.nextServiceDate,
        serviceInterval: component.maintenance.serviceInterval,
        history: component.maintenance.history
      }
    });
  } catch (error: any) {
    console.error('Error fetching maintenance history:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Error fetching maintenance history'
    });
  }
};

/**
 * Get all components for a manifold
 *
 * @route GET /api/components/manifold/:manifoldId
 * @access Private
 */
export const getManifoldComponents = async (req: Request, res: Response): Promise<void> => {
  try {
    // Verify ownership
    const manifold = await Manifold.findOne({
      _id: req.params.manifoldId,
      owner: req.user._id
    });

    if (!manifold) {
      res.status(404).json({
        error: 'MANIFOLD_NOT_FOUND',
        message: 'Manifold not found or you do not have access'
      });
      return;
    }

    const components = await Component.find({ manifoldId: manifold._id })
      .sort({ 'position.flowOrder': 1 });

    // Group by section
    const groupedComponents = {
      INLET: components.filter(c => c.position.section === 'INLET'),
      FILTER: components.filter(c => c.position.section === 'FILTER'),
      CONTROL: components.filter(c => c.position.section === 'CONTROL'),
      VALVE_BANK: components.filter(c => c.position.section === 'VALVE_BANK'),
      OUTLET: components.filter(c => c.position.section === 'OUTLET')
    };

    res.json({
      success: true,
      components,
      groupedComponents
    });
  } catch (error: any) {
    console.error('Error fetching manifold components:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Error fetching manifold components'
    });
  }
};
