import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult} from 'react-beautiful-dnd';
import { 
  GripVertical, 
  ToggleLeft, 
  SlidersHorizontal, 
  Activity, 
  BarChart3, 
  Hash, 
  CirclePlay,
  Thermometer,
  Droplets,
  Wind,
  Plug,
  LightbulbIcon,
  BellRing,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { io, Socket } from 'socket.io-client';

// Sample Chart Implementation (can be replaced with actual Recharts implementation)
const SimpleChart = ({ data = [25, 36, 43, 29, 40, 27, 33] }) => {
  const maxValue = Math.max(...data);
  
  return (
    <div className="h-20 flex items-end justify-between gap-1">
      {data.map((value, i) => (
        <div 
          key={i} 
          className="bg-blue-500 rounded-t w-full" 
          style={{ height: `${(value / maxValue) * 100}%` }}
        ></div>
      ))}
    </div>
  );
};

// Gauge Component
const Gauge = ({ value = 50, min = 0, max = 100, label = 'Value', color = 'blue' }) => {
  const percentage = ((value - min) / (max - min)) * 100;
  
  // Get color class based on value
  const getColorClass = () => {
    if (color === 'blue') return 'bg-blue-500';
    if (color === 'green') return 'bg-green-500';
    if (color === 'yellow') return 'bg-yellow-500';
    if (color === 'red') return 'bg-red-500';
    return 'bg-blue-500';
  };
  
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span>{min}</span>
        <span>{max}</span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full ${getColorClass()}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <div className="flex justify-between items-center mt-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Badge>{value}</Badge>
      </div>
    </div>
  );
};

interface Widget {
  id: string;
  type: string;
  title: string;
  config: {
    deviceId: string | null;
    min?: number;
    max?: number;
    step?: number;
    label?: string;
    unit?: string;
    color?: string;
    data?: number[];
    type?: string;
    timeframe?: string;
    message?: string;
    level?: string;
    autoReset?: boolean;
  };
  value?: number | string | boolean;
  data?: Array<number>;
}

interface DeviceData {
  deviceId: string;
  data: {
    temperature?: number;
    humidity?: number;
    value?: number;
    [key: string]: unknown;
  };
}

export const Dashboard: React.FC = () => {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [availableWidgets] = useState([
    { type: 'switch', title: 'Switch', icon: <ToggleLeft className="h-5 w-5" /> },
    { type: 'slider', title: 'Slider', icon: <SlidersHorizontal className="h-5 w-5" /> },
    { type: 'gauge', title: 'Gauge', icon: <Activity className="h-5 w-5" /> },
    { type: 'chart', title: 'Chart', icon: <BarChart3 className="h-5 w-5" /> },
    { type: 'value', title: 'Value Display', icon: <Hash className="h-5 w-5" /> },
    { type: 'button', title: 'Button', icon: <CirclePlay className="h-5 w-5" /> },
    { type: 'temperature', title: 'Temperature', icon: <Thermometer className="h-5 w-5" /> },
    { type: 'humidity', title: 'Humidity', icon: <Droplets className="h-5 w-5" /> },
    { type: 'windspeed', title: 'Wind Speed', icon: <Wind className="h-5 w-5" /> },
    { type: 'power', title: 'Power Meter', icon: <Plug className="h-5 w-5" /> },
    { type: 'light', title: 'Light Control', icon: <LightbulbIcon className="h-5 w-5" /> },
    { type: 'alert', title: 'Alert', icon: <BellRing className="h-5 w-5" /> },
    { type: 'timer', title: 'Timer', icon: <Clock className="h-5 w-5" /> }
  ]);
  
  // Socket connection for device updates
  const socketRef = React.useRef<Socket | null>(null);
  
  useEffect(() => {
    // Connect to Socket.io for real-time updates
    socketRef.current = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000
    });
    
    const socket = socketRef.current;
    
    socket.on('connect', () => {
      console.log('Dashboard connected to socket server');
    });
    
    socket.on('deviceData', (data: DeviceData) => {
      // Update widgets with matching device data
      updateWidgetsWithDeviceData(data);
    });
    
    return () => {
      socket.disconnect();
    };
  }, []);
  
  // Update widgets with real-time device data
  const updateWidgetsWithDeviceData = (deviceData: DeviceData) => {
    // Check if any widgets are connected to this device and update them
    setWidgets(prevWidgets => 
      prevWidgets.map(widget => {
        if (widget.config.deviceId === deviceData.deviceId) {
          const updatedWidget = { ...widget };
          
          // Update value based on widget type
          if (widget.type === 'temperature' && deviceData.data.temperature !== undefined) {
            updatedWidget.value = deviceData.data.temperature;
          } else if (widget.type === 'humidity' && deviceData.data.humidity !== undefined) {
            updatedWidget.value = deviceData.data.humidity;
          } else if (['switch', 'light', 'power'].includes(widget.type) && deviceData.data.value !== undefined) {
            updatedWidget.value = deviceData.data.value > 0;
          } else if (['slider', 'gauge'].includes(widget.type) && deviceData.data.value !== undefined) {
            updatedWidget.value = deviceData.data.value;
          }
          
          return updatedWidget;
        }
        return widget;
      })
    );
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    if (result.source.droppableId === 'WIDGETS' &&
        result.destination.droppableId === 'DASHBOARD') {
      // Add new widget
      const widgetType = result.draggableId;
      const widgetTitle = availableWidgets.find(w => w.type === widgetType)?.title || `New ${widgetType}`;
      
      // Create default values and config based on widget type with proper type safety
      let defaultValue: number | string | boolean | undefined = 0;
      let defaultConfig: Widget['config'];
      
      switch (widgetType) {
        case 'switch':
        case 'light':
          defaultValue = false;
          defaultConfig = { deviceId: null };
          break;
        case 'slider':
          defaultValue = 50;
          defaultConfig = { 
            deviceId: null,
            min: 0, 
            max: 100, 
            step: 1
          };
          break;
        case 'gauge':
          defaultValue = 45;
          defaultConfig = { 
            deviceId: null,
            min: 0, 
            max: 100, 
            label: 'Value', 
            color: 'blue'
          };
          break;
        case 'chart':
          defaultValue = undefined;  // Chart doesn't need a direct value
          defaultConfig = { 
            deviceId: null,
            data: [25, 36, 43, 29, 40, 27, 33], 
            type: 'bar',
            timeframe: 'day'
          };
          break;
        case 'value':
          defaultValue = '25';
          defaultConfig = { 
            deviceId: null,
            label: 'Value', 
            unit: ''
          };
          break;
        case 'temperature':
          defaultValue = 22.5;
          defaultConfig = { 
            deviceId: null,
            unit: '°C'
          };
          break;
        case 'humidity':
          defaultValue = 45;
          defaultConfig = { 
            deviceId: null,
            unit: '%'
          };
          break;
        case 'windspeed':
          defaultValue = 15;
          defaultConfig = { 
            deviceId: null,
            unit: 'km/h'
          };
          break;
        case 'power':
          defaultValue = false;
          defaultConfig = { deviceId: null };
          break;
        case 'alert':
          defaultValue = false;
          defaultConfig = { 
            deviceId: null,
            message: 'Alert triggered!', 
            level: 'info'
          };
          break;
        case 'timer':
          defaultValue = 10;
          defaultConfig = { 
            deviceId: null,
            unit: 'minutes', 
            autoReset: true
          };
          break;
        default:
          defaultValue = 0;
          defaultConfig = { deviceId: null };
      }
      
      const newWidget: Widget = {
        id: `widget-${Date.now()}`,
        type: widgetType,
        title: widgetTitle,
        value: defaultValue,
        config: defaultConfig
      };
      
      setWidgets([...widgets, newWidget]);
    } else if (result.source.droppableId === 'DASHBOARD' && 
               result.destination.droppableId === 'DASHBOARD') {
      // Reorder existing widgets
      const items = Array.from(widgets);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);
      setWidgets(items);
    }
  };

  // Handle widget value change
  const handleWidgetValueChange = (id: string, value: number | string | boolean) => {
    setWidgets(prevWidgets => 
      prevWidgets.map(widget => 
        widget.id === id 
          ? { ...widget, value } 
          : widget
      )
    );
    
    const widget = widgets.find(w => w.id === id);
    if (widget?.config?.deviceId) {
      // Send command to device
      console.log(`Sending command to device ${widget.config.deviceId}: ${value}`);
    }
  };

  // Render different widget content based on type
  const renderWidgetContent = (widget: Widget) => {
    switch (widget.type) {
      case 'switch':
        return (
          <div className="flex justify-between items-center pt-2">
            <span className="text-sm text-muted-foreground">Power</span>
            <Switch 
              checked={widget.value as boolean} 
              onCheckedChange={(checked) => handleWidgetValueChange(widget.id, checked)}
            />
          </div>
        );
        
      case 'slider':
        return (
          <div className="pt-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">{widget.config.label || 'Value'}</span>
              <Badge>{widget.value}</Badge>
            </div>
            <Slider
              value={[widget.value as number]}
              min={widget.config.min || 0}
              max={widget.config.max || 100}
              step={widget.config.step || 1}
              onValueChange={(values) => handleWidgetValueChange(widget.id, values[0])}
            />
          </div>
        );
        
      case 'gauge':
        return (
          <div className="pt-2">
            <Gauge 
              value={widget.value as number}
              min={widget.config.min}
              max={widget.config.max}
              label={widget.config.label}
              color={widget.config.color}
            />
          </div>
        );
        
      case 'chart':
        return (
          <div className="pt-2">
            <SimpleChart data={widget.config.data} />
          </div>
        );
        
      case 'value':
        return (
          <div className="pt-2 text-center">
            <div className="text-3xl font-bold">
              {widget.value}
              <span className="text-sm ml-1 text-muted-foreground">{widget.config.unit}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{widget.config.label}</p>
          </div>
        );
        
      case 'button':
        return (
          <div className="pt-2 flex justify-center">
            <Button 
              onClick={() => handleWidgetValueChange(widget.id, true)}
              className="w-full"
            >
              {widget.config.label || "Press"}
            </Button>
          </div>
        );
      
      case 'temperature':
        return (
          <div className="pt-2 text-center">
            <div className="flex items-center justify-center mb-2">
              <Thermometer className="h-6 w-6 text-orange-500 mr-2" />
            </div>
            <div className="text-3xl font-bold">
              {widget.value}
              <span className="text-sm ml-1 text-muted-foreground">{widget.config.unit}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Temperature</p>
          </div>
        );
      
      case 'humidity':
        return (
          <div className="pt-2 text-center">
            <div className="flex items-center justify-center mb-2">
              <Droplets className="h-6 w-6 text-blue-500 mr-2" />
            </div>
            <div className="text-3xl font-bold">
              {widget.value}
              <span className="text-sm ml-1 text-muted-foreground">{widget.config.unit}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Humidity</p>
          </div>
        );
      
      case 'windspeed':
        return (
          <div className="pt-2 text-center">
            <div className="flex items-center justify-center mb-2">
              <Wind className="h-6 w-6 text-cyan-500 mr-2" />
            </div>
            <div className="text-3xl font-bold">
              {widget.value}
              <span className="text-sm ml-1 text-muted-foreground">{widget.config.unit}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Wind Speed</p>
          </div>
        );
      
      case 'power':
        return (
          <div className="pt-2">
            <div className="flex items-center justify-center mb-2">
              <Plug className="h-6 w-6 text-green-500 mr-2" />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Power</span>
              <Switch 
                checked={widget.value as boolean} 
                onCheckedChange={(checked) => handleWidgetValueChange(widget.id, checked)}
              />
            </div>
          </div>
        );
      
      case 'light':
        return (
          <div className="pt-2">
            <div className="flex items-center justify-center mb-2">
              <LightbulbIcon className="h-6 w-6 text-yellow-500 mr-2" />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Light</span>
              <Switch 
                checked={widget.value as boolean} 
                onCheckedChange={(checked) => handleWidgetValueChange(widget.id, checked)}
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="p-4">
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="DASHBOARD" direction="horizontal">
          {(provided) => (
            <div 
              ref={provided.innerRef} 
              {...provided.droppableProps} 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {widgets.map((widget, index) => (
                <Draggable key={widget.id} draggableId={widget.id} index={index}>
                  {(provided) => (
                    <div 
                      ref={provided.innerRef} 
                      {...provided.draggableProps} 
                      {...provided.dragHandleProps}
                      className="border rounded-lg p-4"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold">{widget.title}</h3>
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                      </div>
                      {renderWidgetContent(widget)}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};