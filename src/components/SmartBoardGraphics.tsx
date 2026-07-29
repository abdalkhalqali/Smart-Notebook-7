/**
 * SmartBoard Graphics Integration
 * Connects the clever-painter engine to the SmartBoard canvas
 */

import { GraphicsEngine, registerBuiltinCommands, COMMAND_CATALOG } from '../../clever-painter/index.js';

export interface GraphicsCommand {
  type: 'circuit' | 'graph' | 'force' | 'wave' | 'mechanical' | 'field' | 'beam';
  params: Record<string, unknown>;
}

/**
 * Draw a scientific diagram on a temporary canvas, then return as ImageData
 */
export function renderGraphicsToCanvas(
  command: GraphicsCommand,
  width: number = 400,
  height: number = 300
): Promise<ImageData | null> {
  return new Promise((resolve) => {
    try {
      // Create temporary canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      
      // Initialize GraphicsEngine
      const engine = new GraphicsEngine(tempCanvas, {
        width,
        height,
        bgColor: 'transparent',
        devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
      } as any);
      
      // Register built-in commands
      registerBuiltinCommands(engine);
      
      // Execute the drawing command
      engine.execute({
        action: 'draw',
        type: command.type,
        ...command.params,
      });
      
      // Get the rendered image data
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, width, height);
        resolve(imageData);
      } else {
        resolve(null);
      }
    } catch (error) {
      console.error('[SmartBoardGraphics] Error rendering:', error);
      resolve(null);
    }
  });
}

/**
 * Parse natural language (Arabic/English) into a graphics command
 * Used when the user asks the AI to draw something
 */
export function parseGraphicsRequest(text: string): GraphicsCommand | null {
  const lower = text.toLowerCase();
  
  // Circuit detection
  if (lower.includes('دائرة') || lower.includes('كهرباء') || lower.includes('circuit') || lower.includes('battery') || lower.includes('بطارية')) {
    const components = [];
    
    if (lower.includes('بطارية') || lower.includes('battery')) {
      components.push({ type: 'battery', voltage: 12 });
    }
    if (lower.includes('مقاومة') || lower.includes('resistor') || lower.includes('اوم')) {
      components.push({ type: 'resistor', value: '10Ω' });
    }
    if (lower.includes('لمبة') || lower.includes('مصباح') || lower.includes('bulb')) {
      components.push({ type: 'bulb' });
    }
    if (lower.includes('مفتاح') || lower.includes('switch')) {
      components.push({ type: 'switch' });
    }
    if (lower.includes('مكثف') || lower.includes('capacitor')) {
      components.push({ type: 'capacitor', value: '100μF' });
    }
    if (lower.includes('ملف') || lower.includes('محث') || lower.includes('inductor')) {
      components.push({ type: 'inductor', value: '10mH' });
    }
    
    // Default circuit if no specific components
    if (components.length === 0) {
      components.push(
        { type: 'battery', voltage: 12 },
        { type: 'resistor', value: '10Ω' }
      );
    }
    
    return {
      type: 'circuit',
      params: { components, title: 'دائرة كهربائية' },
    };
  }
  
  // Graph detection
  if (lower.includes('رسم بياني') || lower.includes('منحنى') || lower.includes('graph') || lower.includes('دالة')) {
    let expression = '0.1*x*Math.sin(x/20)';
    if (lower.includes('جيب') || lower.includes('sin')) {
      expression = 'Math.sin(x/30)';
    } else if (lower.includes('جذر') || lower.includes('sqrt')) {
      expression = 'Math.sqrt(Math.abs(x))';
    } else if (lower.includes('تربيع') || lower.includes('مربع') || lower.includes('^2')) {
      expression = '0.01*x*x';
    }
    
    return {
      type: 'graph',
      params: { expression, xRange: [-200, 200], color: '#2563eb' },
    };
  }
  
  // Wave detection
  if (lower.includes('موجة') || lower.includes('تموج') || lower.includes('wave')) {
    return {
      type: 'wave',
      params: { amplitude: 50, frequency: 0.05, wavelength: 120 },
    };
  }
  
  // Force diagram
  if (lower.includes('قوى') || lower.includes('قوة') || lower.includes('force') || lower.includes('جاذبية')) {
    const forces = [];
    if (lower.includes('جاذبية') || lower.includes('وزن') || lower.includes('gravity') || lower.includes('weight')) {
      forces.push({ label: 'W', magnitude: 100, angle: 90, color: '#dc2626' });
    }
    if (lower.includes('تدفع') || lower.includes('قوة') || lower.includes('push')) {
      forces.push({ label: 'F', magnitude: 80, angle: 0, color: '#2563eb' });
    }
    if (lower.includes('احتكاك') || lower.includes('friction')) {
      forces.push({ label: 'f', magnitude: 40, angle: 180, color: '#16a34a' });
    }
    
    if (forces.length === 0) {
      forces.push(
        { label: 'W', magnitude: 100, angle: 90, color: '#dc2626' },
        { label: 'N', magnitude: 100, angle: 270, color: '#2563eb' },
        { label: 'F', magnitude: 60, angle: 0, color: '#16a34a' }
      );
    }
    
    return {
      type: 'force',
      params: { forces },
    };
  }
  
  return null;
}

/**
 * Get available command types with Arabic descriptions
 */
export function getGraphicsCommandsList() {
  return Object.entries(COMMAND_CATALOG).map(([key, value]) => ({
    type: key,
    description: value.description,
    examples: value.examples,
  }));
}
