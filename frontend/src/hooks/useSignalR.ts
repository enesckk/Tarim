import { useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import toast from 'react-hot-toast';

export function useSignalR() {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const apiBaseUrl = import.meta.env.VITE_API_URL;
    if (!apiBaseUrl) {
      console.log('SignalR disabled: VITE_API_URL is not set.');
      return;
    }

    const hubUrl = `${apiBaseUrl}/hubs/notifications`;

    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();

    setConnection(newConnection);
  }, []);

  useEffect(() => {
    if (connection) {
      connection
        .start()
        .then(() => {
          console.log('SignalR Connected.');
          
          connection.on('ReceiveNotification', (notification: any) => {
            console.log('Received notification', notification);
            toast.success(`${notification.title}\n${notification.message}`, {
              duration: 5000,
              position: 'top-right',
            });
            // We could also dispatch a global event or update a context here if we want to show a badge
          });
        })
        .catch((e) => console.log('Connection failed: ', e));
    }

    return () => {
      if (connection) {
        connection.off('ReceiveNotification');
        connection.stop();
      }
    };
  }, [connection]);

  return connection;
}
