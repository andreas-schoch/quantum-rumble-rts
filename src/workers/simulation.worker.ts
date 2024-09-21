import { expose } from 'comlink';
import { TerrainSimulation } from '../terrain/TerrainSimulation';

const simulation = new TerrainSimulation();
expose(simulation);
