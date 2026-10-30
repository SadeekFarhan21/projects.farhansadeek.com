import './assets/css/App.css';
import { Routes, Route, Navigate } from 'react-router-dom';
import {
  ChakraProvider,
} from '@chakra-ui/react';

import initialTheme from './theme/theme'; //  { themeGreen }
import { useState } from 'react';

import MainDashboard from 'views';

export default function Main() {
  // eslint-disable-next-line
  const [currentTheme, setCurrentTheme] = useState(initialTheme);
  return (
    <ChakraProvider theme={currentTheme}>
     <MainDashboard />
    </ChakraProvider>
  );
}
