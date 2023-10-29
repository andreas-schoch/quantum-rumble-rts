import { expose } from 'comlink';
import { Graph } from '../Graph';

const graphInstance = new Graph();
expose(graphInstance);
