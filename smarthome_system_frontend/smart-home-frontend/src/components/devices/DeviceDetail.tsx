import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDeviceStore } from '@/store/deviceStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft,
  Edit,
  Trash2,
  Power,
  PowerOff,
  RefreshCw,
  Activity,
  Settings,
  Clock
} from 'lucide-react';
import { DeviceStatus, DeviceType } from '@/types/device';
import { format } from 'date-fns';

export default function DeviceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    currentDevice, 
    isLoading, 
    error,
    fetchDeviceById,
    controlDevice,
    deleteDevice,
    clearCurrentDevice
  } = useDeviceStore();

  useEffect(() => {
    if (id) {
      fetchDeviceById(parseInt(id));
    }

    return () => {
      clearCurrentDevice();
    };
  }, [id]);

  const handleControl = async (action: 'TURN_ON' | 'TURN_OFF' | 'TOGGLE') => {
    if (!id) return;
    await controlDevice(parseInt(id), action);
  };

  const handleDelete = async () => {
    if (!id || !window.confirm('Are you sure you want to delete this device?')) return;
    
    try {
      await deleteDevice(parseInt(id));
      navigate('/devices');
    } catch (error) {
      console.error('Failed to delete device:', error);
    }
  };

  const getStatusColor = (status: DeviceStatus) => {
    switch (status) {
      case DeviceStatus.ON:
      case DeviceStatus.ONLINE:
        return 'bg-green-500';
      case DeviceStatus.OFF:
      case DeviceStatus.OFFLINE:
        return 'bg-red-500';
      default:
        return 'bg-yellow-500';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !currentDevice) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Device Not Found</h2>
        <p className="text-muted-foreground mb-4">{error || 'The device does not exist.'}</p>
        <Button onClick={() => navigate('/devices')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Devices
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/devices')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{currentDevice.name}</h1>
            <p className="text-muted-foreground">Device ID: {currentDevice.id}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/devices/${id}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Device Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Control Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="mr-2 h-5 w-5" />
                Device Control
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  className="flex-1 min-w-[120px]"
                  onClick={() => handleControl('TURN_ON')}
                  disabled={currentDevice.deviceStatus === DeviceStatus.OFFLINE}
                >
                  <Power className="mr-2 h-5 w-5" />
                  Turn On
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1 min-w-[120px]"
                  onClick={() => handleControl('TURN_OFF')}
                  disabled={currentDevice.deviceStatus === DeviceStatus.OFFLINE}
                >
                  <PowerOff className="mr-2 h-5 w-5" />
                  Turn Off
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  className="flex-1 min-w-[120px]"
                  onClick={() => handleControl('TOGGLE')}
                  disabled={currentDevice.deviceStatus === DeviceStatus.OFFLINE}
                >
                  <RefreshCw className="mr-2 h-5 w-5" />
                  Toggle
                </Button>
              </div>
              
              {currentDevice.deviceStatus === DeviceStatus.OFFLINE && (
                <div className="mt-4 p-3 bg-yellow-100 border border-yellow-200 rounded-md">
                  <p className="text-yellow-800 text-sm">
                    Device is offline and cannot receive commands.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* State Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                Device State
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentDevice.stateValue ? (
                <div className="font-mono text-sm bg-muted p-4 rounded">
                  <pre>{JSON.stringify(JSON.parse(currentDevice.stateValue), null, 2)}</pre>
                </div>
              ) : (
                <p className="text-muted-foreground italic">No state information available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Details */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Device Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Current Status</span>
                  <Badge className={`${getStatusColor(currentDevice.deviceStatus)} text-white`}>
                    {currentDevice.deviceStatus}
                  </Badge>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Device Type</span>
                    <Badge variant="outline">{currentDevice.deviceType}</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Device Code</span>
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {currentDevice.deviceCode}
                    </code>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Room</span>
                    <span>{currentDevice.roomName || `Room ${currentDevice.roomId}`}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metadata Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                Timestamps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Created At</span>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(currentDevice.createdAt), 'PPpp')}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Last Updated</span>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(currentDevice.updatedAt), 'PPpp')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          {currentDevice.metadata && (
            <Card>
              <CardHeader>
                <CardTitle>Metadata</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{currentDevice.metadata}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}