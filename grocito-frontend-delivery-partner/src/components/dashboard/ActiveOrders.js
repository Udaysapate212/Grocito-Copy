import React, { useState } from 'react';
import { 
  ArchiveBoxIcon, 
  TruckIcon, 
  CheckCircleIcon, 
  MapPinIcon, 
  UserIcon, 
  PhoneIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon 
} from '@heroicons/react/24/outline';
import PaymentManagement from '../payment/PaymentManagement';

const ActiveOrders = ({ orders, onUpdateStatus, loading, onRefreshOrders }) => {
  const [updatingOrder, setUpdatingOrder] = useState(null);

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdatingOrder(orderId);
    try {
      await onUpdateStatus(orderId, newStatus);
    } finally {
      setUpdatingOrder(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ASSIGNED':
        return 'bg-blue-100 text-blue-800';
      case 'PICKED_UP':
        return 'bg-yellow-100 text-yellow-800';
      case 'OUT_FOR_DELIVERY':
        return 'bg-purple-100 text-purple-800';
      case 'DELIVERED':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getNextAction = (status, order) => {
    console.log('🔍 getNextAction - Order:', order.id, 'Status:', status, 'PaymentMethod:', order.paymentMethod, 'PaymentStatus:', order.paymentStatus);
    
    switch (status) {
      case 'ASSIGNED':
        return { action: 'PICKED_UP', label: 'Mark as Picked Up', icon: <ArchiveBoxIcon className="h-4 w-4" />, enabled: true };
      case 'PICKED_UP':
        return { action: 'OUT_FOR_DELIVERY', label: 'Start Delivery', icon: <TruckIcon className="h-4 w-4" />, enabled: true };
      case 'OUT_FOR_DELIVERY':
        // CRITICAL: For COD orders, MUST collect payment before delivery completion
        const isCODOrder = order.paymentMethod === 'COD' || !order.paymentMethod; // Default to COD if not specified
        const isPaymentPending = order.paymentStatus === 'PENDING' || !order.paymentStatus; // Default to PENDING if not specified
        
        console.log('🔍 Delivery Check - isCODOrder:', isCODOrder, 'isPaymentPending:', isPaymentPending);
        
        if (isCODOrder && isPaymentPending) {
          console.log('🚫 BLOCKING DELIVERY - Payment not collected for COD order');
          return { 
            action: 'DELIVERED', 
            label: 'Collect Payment First', 
            icon: <CurrencyDollarIcon className="h-4 w-4" />, 
            enabled: false,
            reason: 'COD payment must be collected before marking as delivered. Use the payment collection interface below.'
          };
        }
        
        console.log('✅ ALLOWING DELIVERY - Payment collected or online order');
        return { action: 'DELIVERED', label: 'Mark as Delivered', icon: <CheckCircleIcon className="h-4 w-4" />, enabled: true };
      default:
        return null;
    }
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAddress = (address) => {
    return address.length > 60 ? address.substring(0, 60) + '...' : address;
  };

  const getTimeElapsed = (dateString) => {
    const now = new Date();
    const orderTime = new Date(dateString);
    const diffInMinutes = Math.floor((now - orderTime) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ${diffInMinutes % 60}m ago`;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Active Orders</h2>
            <p className="text-gray-600 text-sm mt-1">Orders currently in progress</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${orders.length > 0 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
            <span className="text-sm font-medium text-gray-700">{orders.length} active</span>
          </div>
        </div>
      </div>

      <div className="p-6">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 bg-gray-50 rounded-full flex items-center justify-center border-2 border-gray-200">
              <ClipboardDocumentListIcon className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Orders</h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              Your accepted orders will appear here. Accept available orders to start delivering.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const nextAction = getNextAction(order.status, order);
              const isUpdating = updatingOrder === order.id;
              
              return (
                <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                        <span className="text-sm text-gray-500">
                          #{order.id} • {getTimeElapsed(order.orderTime)}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <MapPinIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-700">{formatAddress(order.deliveryAddress)}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <UserIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-700">{order.user?.fullName || 'Customer'}</span>
                          {order.user?.contactNumber && (
                            <a 
                              href={`tel:${order.user.contactNumber}`}
                              className="text-blue-600 hover:text-blue-800 text-sm ml-2 flex items-center space-x-1"
                            >
                              <PhoneIcon className="w-4 h-4" />
                              <span>Call</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right ml-4">
                      <div className="text-lg font-semibold text-gray-900 mb-2">
                        ₹{order.totalAmount?.toFixed(2) || '0.00'}
                      </div>
                      
                      {nextAction && (
                        <div>
                          <button
                            onClick={() => nextAction.enabled && handleStatusUpdate(order.id, nextAction.action)}
                            disabled={isUpdating || loading || !nextAction.enabled}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                              isUpdating || !nextAction.enabled
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
                            }`}
                            title={!nextAction.enabled ? nextAction.reason : ''}
                          >
                            {isUpdating ? (
                              <div className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Updating...</span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <span>{nextAction.icon}</span>
                                <span>{nextAction.label}</span>
                              </div>
                            )}
                          </button>
                          {!nextAction.enabled && nextAction.reason && (
                            <p className="text-xs text-red-600 mt-1">{nextAction.reason}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Order Timeline */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>Assigned: {formatTime(order.assignedAt || order.orderTime)}</span>
                      </div>
                      
                      {order.pickedUpAt && (
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <span>Picked: {formatTime(order.pickedUpAt)}</span>
                        </div>
                      )}
                      
                      {order.deliveredAt && (
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Delivered: {formatTime(order.deliveredAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Order Items */}
                  {order.items && order.items.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>Items:</span>
                        <div className="flex flex-wrap gap-1">
                          {order.items.slice(0, 4).map((item, index) => (
                            <span key={index} className="bg-gray-100 px-2 py-1 rounded">
                              {item.product?.name || 'Item'} x{item.quantity}
                            </span>
                          ))}
                          {order.items.length > 4 && (
                            <span className="text-gray-400">+{order.items.length - 4} more</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Payment Management for COD Orders */}
                  <PaymentManagement 
                    order={order} 
                    onPaymentUpdate={(updatedOrder) => {
                      console.log('Payment updated for order:', updatedOrder.id);
                      // Call the refresh callback from parent component
                      if (onRefreshOrders) {
                        onRefreshOrders();
                      }
                    }} 
                  />
                  
                  {/* Emergency Actions */}
                  <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                    <button
                      onClick={() => handleStatusUpdate(order.id, 'CANCELLED')}
                      disabled={isUpdating || loading}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Cancel Order
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveOrders;