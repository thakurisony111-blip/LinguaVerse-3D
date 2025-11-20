import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Environment, Sparkles, SoftShadows } from '@react-three/drei';
import * as THREE from 'three';
import { Scenario } from '../types';

interface SceneProps {
  scenario: Scenario;
  isAiSpeaking: boolean;
}

// --- Responsive Camera Helper ---
const ResponsiveCamera = () => {
  const { camera, size } = useThree();
  
  useEffect(() => {
    const aspect = size.width / size.height;
    // Adjust camera based on aspect ratio (Mobile vs Desktop)
    if (aspect < 1) {
       // Portrait (Mobile) - Pull back
       camera.position.set(0, 3.5, 10);
    } else {
       // Landscape (Desktop) - Standard
       camera.position.set(0, 2.5, 6);
    }
    camera.updateProjectionMatrix();
  }, [size, camera]);

  return null;
};

// --- Reusable Materials & Geometries ---

const WallMaterial = ({ color }: { color: string }) => (
  <meshStandardMaterial 
    color={color} 
    roughness={0.8} 
    metalness={0.1} 
    side={THREE.DoubleSide}
  />
);

const FloorMaterial = ({ color, roughness = 0.8 }: { color: string, roughness?: number }) => (
  <meshStandardMaterial 
    color={color} 
    roughness={roughness} 
    metalness={0.1} 
  />
);

const GlassMaterial = () => (
  <meshPhysicalMaterial 
    transparent 
    opacity={0.3} 
    roughness={0} 
    metalness={0.9} 
    color="#a5d6a7"
    transmission={0.5}
    thickness={0.5}
  />
);

// --- Props ---

const CoffeeSteam = ({ position }: { position: [number, number, number] }) => {
    return (
        <group position={position}>
            <Sparkles count={15} scale={[0.2, 0.5, 0.2]} size={2} speed={0.5} opacity={0.4} color="#fff" position={[0, 0.3, 0]} />
        </group>
    );
}

const PendantLight = ({ position }: { position: [number, number, number] }) => (
    <group position={position}>
        <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 1]} />
            <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        <mesh position={[0, 0, 0]}>
            <coneGeometry args={[0.3, 0.4, 32, 1, true]} />
            <meshStandardMaterial color="#212121" side={THREE.DoubleSide} />
        </mesh>
        <pointLight position={[0, -0.2, 0]} intensity={3} distance={5} color="#ffecb3" decay={2} />
        <mesh position={[0, -0.1, 0]}>
            <sphereGeometry args={[0.1]} />
            <meshBasicMaterial color="#ffecb3" />
        </mesh>
    </group>
);

const DetailedMug = ({ position }: { position: [number, number, number] }) => (
    <group position={position}>
        <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.08, 0.07, 0.18]} />
            <meshStandardMaterial color="#eceff1" roughness={0.2} />
        </mesh>
        <mesh position={[0.08, 0.02, 0]} rotation={[0, 0, Math.PI/2]}>
            <torusGeometry args={[0.06, 0.015, 8, 16]} />
            <meshStandardMaterial color="#eceff1" />
        </mesh>
        <mesh position={[0, 0.08, 0]} rotation={[-Math.PI/2, 0, 0]}>
            <circleGeometry args={[0.065]} />
            <meshStandardMaterial color="#3e2723" roughness={0.5} />
        </mesh>
        <CoffeeSteam position={[0,0,0]} />
    </group>
);

const ModernChair = ({ position, rotation = [0,0,0] }: { position: [number, number, number], rotation?: [number, number, number] }) => (
    <group position={position} rotation={rotation as any}>
        {/* Legs */}
        <mesh position={[-0.2, 0.25, 0.2]} castShadow><cylinderGeometry args={[0.03, 0.02, 0.5]} /><meshStandardMaterial color="#3e2723" /></mesh>
        <mesh position={[0.2, 0.25, 0.2]} castShadow><cylinderGeometry args={[0.03, 0.02, 0.5]} /><meshStandardMaterial color="#3e2723" /></mesh>
        <mesh position={[-0.2, 0.25, -0.2]} castShadow><cylinderGeometry args={[0.03, 0.02, 0.5]} /><meshStandardMaterial color="#3e2723" /></mesh>
        <mesh position={[0.2, 0.25, -0.2]} castShadow><cylinderGeometry args={[0.03, 0.02, 0.5]} /><meshStandardMaterial color="#3e2723" /></mesh>
        {/* Seat */}
        <mesh position={[0, 0.52, 0]} castShadow>
            <boxGeometry args={[0.5, 0.05, 0.5]} />
            <meshStandardMaterial color="#5d4037" />
        </mesh>
        {/* Back */}
        <mesh position={[0, 0.9, -0.23]} rotation={[0.1, 0, 0]} castShadow>
             <boxGeometry args={[0.5, 0.4, 0.05]} />
             <meshStandardMaterial color="#5d4037" />
        </mesh>
    </group>
);

const CafeTable = ({ position }: { position: [number, number, number] }) => (
    <group position={position}>
        <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.6, 0.6, 0.04, 64]} />
            <meshStandardMaterial color="#f5f5f5" roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.37, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 0.75]} />
            <meshStandardMaterial color="#212121" />
        </mesh>
        <mesh position={[0, 0.02, 0]} receiveShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.04]} />
            <meshStandardMaterial color="#212121" />
        </mesh>
    </group>
);

// --- Character ---

const Avatar = ({ isSpeaking, position }: { isSpeaking: boolean, position: [number, number, number] }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.elapsedTime;
      // Idle breathing
      groupRef.current.position.y = position[1] + Math.sin(t * 1) * 0.02;
      
      if (isSpeaking) {
         // Subtle speaking animation
         groupRef.current.rotation.y = Math.sin(t * 4) * 0.05;
         groupRef.current.rotation.x = Math.sin(t * 6) * 0.02;
      } else {
         // Look around occasionally
         groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, Math.sin(t * 0.5) * 0.1, 0.05);
         groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.1);
      }
    }
  });

  return (
    <group ref={groupRef} position={position}>
       {/* Body */}
       <mesh position={[0, 0.7, 0]} castShadow>
         <capsuleGeometry args={[0.3, 1.3, 4, 16]} />
         <meshStandardMaterial color="#455a64" roughness={0.6} />
       </mesh>
       {/* Apron/Uniform */}
       <mesh position={[0, 0.6, 0.28]} rotation={[-0.1,0,0]} castShadow>
          <boxGeometry args={[0.5, 0.8, 0.05]} />
          <meshStandardMaterial color="#263238" />
       </mesh>
       {/* Head */}
       <mesh position={[0, 1.55, 0]} castShadow>
          <sphereGeometry args={[0.32, 32, 32]} />
          <meshStandardMaterial color="#ffccbc" />
       </mesh>
        {/* Hair */}
       <mesh position={[0, 1.65, -0.05]} castShadow>
          <sphereGeometry args={[0.35, 32, 32]} />
          <meshStandardMaterial color="#3e2723" />
       </mesh>
       {/* Eyes */}
       <group position={[0, 1.6, 0.28]}>
            <mesh position={[-0.1, 0, 0]}>
                <sphereGeometry args={[0.03]} />
                <meshStandardMaterial color="#1a1a1a" />
            </mesh>
            <mesh position={[0.1, 0, 0]}>
                <sphereGeometry args={[0.03]} />
                <meshStandardMaterial color="#1a1a1a" />
            </mesh>
       </group>
    </group>
  );
};

// --- Environments ---

const RealisticCafe = ({ isAiSpeaking }: { isAiSpeaking: boolean }) => {
    return (
        <group>
            <Environment preset="apartment" />
            {/* Room Shell */}
            <group position={[0, 2.5, -2]}>
                 {/* Back Wall */}
                 <mesh position={[0, 0, -5]} receiveShadow>
                    <boxGeometry args={[16, 6, 1]} />
                    <WallMaterial color="#5d4037" />
                 </mesh>
                 {/* Left Wall */}
                 <mesh position={[-8, 0, 0]} rotation={[0, Math.PI/2, 0]} receiveShadow>
                    <boxGeometry args={[12, 6, 1]} />
                    <WallMaterial color="#4e342e" />
                 </mesh>
                 {/* Floor */}
                 <mesh position={[0, -2.55, 2]} rotation={[-Math.PI/2, 0, 0]} receiveShadow>
                    <planeGeometry args={[16, 16]} />
                    <FloorMaterial color="#3e2723" roughness={0.5} />
                 </mesh>
                 {/* Window Frame */}
                 <group position={[3, 0.5, -4.4]}>
                    <mesh>
                        <boxGeometry args={[4, 2.5, 0.2]} />
                        <GlassMaterial />
                    </mesh>
                    <mesh position={[0, 1.3, 0]}>
                        <boxGeometry args={[4.2, 0.2, 0.4]} />
                        <meshStandardMaterial color="#3e2723" />
                    </mesh>
                    <mesh position={[0, -1.3, 0]}>
                        <boxGeometry args={[4.2, 0.2, 0.4]} />
                        <meshStandardMaterial color="#3e2723" />
                    </mesh>
                 </group>
            </group>

            {/* Counter Area */}
            <group position={[0, 0, -2.5]}>
                <mesh position={[0, 0.6, 0]} receiveShadow castShadow>
                    <boxGeometry args={[6, 1.2, 1]} />
                    <meshStandardMaterial color="#4e342e" />
                </mesh>
                <mesh position={[0, 1.21, 0]}>
                    <boxGeometry args={[6.2, 0.05, 1.2]} />
                    <meshStandardMaterial color="#d7ccc8" roughness={0.1} />
                </mesh>
                {/* Register */}
                <mesh position={[1.5, 1.35, 0.2]}>
                    <boxGeometry args={[0.6, 0.4, 0.4]} />
                    <meshStandardMaterial color="#cfd8dc" />
                </mesh>
                <Avatar isSpeaking={isAiSpeaking} position={[0, 0, -1]} />
            </group>

            {/* Seating */}
            <group position={[-2.5, 0, 1]}>
                <CafeTable position={[0, 0, 0]} />
                <ModernChair position={[0, 0, 0.8]} rotation={[0, Math.PI, 0]} />
                <ModernChair position={[0, 0, -0.8]} rotation={[0, 0, 0]} />
                <DetailedMug position={[0.2, 0.78, 0.2]} />
            </group>
             <group position={[2.5, 0, 1]}>
                <CafeTable position={[0, 0, 0]} />
                <ModernChair position={[0, 0, 0.8]} rotation={[0, Math.PI, 0]} />
            </group>

            {/* Lighting */}
            <PendantLight position={[-2.5, 2.5, 1]} />
            <PendantLight position={[2.5, 2.5, 1]} />
            <PendantLight position={[0, 2.5, -2]} />
            
            {/* Menu Board */}
            <group position={[-2, 2.5, -2.5]} rotation={[0.1, 0, 0]}>
                <mesh>
                     <boxGeometry args={[2, 1.2, 0.1]} />
                     <meshStandardMaterial color="#212121" />
                </mesh>
                <Text position={[0, 0.4, 0.06]} fontSize={0.15} color="white">MENU</Text>
                <Text position={[0, 0, 0.06]} fontSize={0.08} color="#bdbdbd" lineHeight={1.6}>
                    Espresso .... $3{'\n'}Latte ....... $4{'\n'}Tea ......... $3
                </Text>
            </group>
            
            <Sparkles count={50} scale={10} size={2} speed={0.4} opacity={0.2} color="#fffde7" />
        </group>
    );
};

const RealisticStation = ({ isAiSpeaking }: { isAiSpeaking: boolean }) => (
  <group>
    <Environment preset="night" />
    {/* Platform */}
    <mesh position={[0, -0.1, 0]} receiveShadow>
        <boxGeometry args={[20, 0.2, 8]} />
        <FloorMaterial color="#78909c" />
    </mesh>
    {/* Safety Line */}
    <mesh position={[0, 0.01, 2.5]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[20, 0.2]} />
        <meshBasicMaterial color="#ffeb3b" />
    </mesh>

    {/* Columns & Roof */}
    <group position={[0, 0, -2]}>
        {[-6, -2, 2, 6].map(x => (
            <mesh key={x} position={[x, 2, 0]} castShadow>
                <cylinderGeometry args={[0.15, 0.15, 4]} />
                <meshStandardMaterial color="#37474f" metalness={0.6} />
            </mesh>
        ))}
        {/* Beams */}
        <mesh position={[0, 4, 0]}>
            <boxGeometry args={[20, 0.3, 0.3]} />
            <meshStandardMaterial color="#263238" />
        </mesh>
         <mesh position={[0, 4, 1]}>
            <boxGeometry args={[20, 0.1, 6]} />
             <meshStandardMaterial color="#455a64" />
        </mesh>
    </group>

    {/* Ticket Kiosk */}
    <group position={[4, 0, -2]}>
        <mesh position={[0, 1, 0]} castShadow>
            <boxGeometry args={[1.5, 2, 0.8]} />
            <meshStandardMaterial color="#cfd8dc" metalness={0.3} />
        </mesh>
        <Text position={[0, 1.6, 0.41]} fontSize={0.15} color="#0d47a1">TICKETS</Text>
        <mesh position={[0, 1, 0.41]}>
            <planeGeometry args={[1.2, 0.8]} />
            <meshStandardMaterial color="#000" />
        </mesh>
    </group>

    {/* Bench */}
    <group position={[-4, 0, 0]}>
        <mesh position={[0, 0.4, 0]} castShadow>
            <boxGeometry args={[3, 0.1, 0.8]} />
            <meshStandardMaterial color="#3e2723" />
        </mesh>
        <mesh position={[0, 0.2, 0.3]}><cylinderGeometry args={[0.05, 0.05, 0.4]} /><meshStandardMaterial color="#212121" /></mesh>
        <mesh position={[0, 0.2, -0.3]}><cylinderGeometry args={[0.05, 0.05, 0.4]} /><meshStandardMaterial color="#212121" /></mesh>
        <mesh position={[-1.2, 0.2, 0]}><cylinderGeometry args={[0.05, 0.05, 0.4]} /><meshStandardMaterial color="#212121" /></mesh>
        <mesh position={[1.2, 0.2, 0]}><cylinderGeometry args={[0.05, 0.05, 0.4]} /><meshStandardMaterial color="#212121" /></mesh>
    </group>

    <Avatar isSpeaking={isAiSpeaking} position={[0, 0, -1]} />

    {/* Tracks */}
    <group position={[0, -0.5, 5]}>
        <mesh>
            <boxGeometry args={[20, 1, 3]} />
            <meshStandardMaterial color="#212121" />
        </mesh>
         {/* Rails */}
         <mesh position={[0, 0.55, -0.8]} rotation={[0,0, Math.PI/2]}>
             <cylinderGeometry args={[0.05, 0.05, 20]} />
             <meshStandardMaterial color="#9e9e9e" metalness={0.9} />
        </mesh>
        <mesh position={[0, 0.55, 0.8]} rotation={[0,0, Math.PI/2]}>
             <cylinderGeometry args={[0.05, 0.05, 20]} />
             <meshStandardMaterial color="#9e9e9e" metalness={0.9} />
        </mesh>
        {/* Sleepers */}
        {Array.from({ length: 20 }).map((_, i) => (
            <mesh key={i} position={[i * 1.2 - 10, 0.52, 0]}>
                <boxGeometry args={[0.4, 0.05, 2.6]} />
                <meshStandardMaterial color="#4e342e" />
            </mesh>
        ))}
    </group>

    {/* Info Board */}
    <group position={[0, 3, -2]}>
        <mesh>
            <boxGeometry args={[3, 1, 0.2]} />
            <meshStandardMaterial color="#000" />
        </mesh>
        <Text position={[0, 0.2, 0.11]} fontSize={0.15} color="orange">DEPARTURES</Text>
        <Text position={[0, -0.2, 0.11]} fontSize={0.1} color="white" font="monospace">
           PARIS   14:05  ON TIME
        </Text>
    </group>
    <Sparkles count={30} scale={15} size={3} color="#e1f5fe" opacity={0.3} />
  </group>
);

const RealisticMarket = ({ isAiSpeaking }: { isAiSpeaking: boolean }) => (
  <group>
    <Environment preset="park" />
    <directionalLight position={[10, 10, 5]} intensity={2} castShadow />
    
    {/* Cobblestone Ground */}
    <mesh position={[0, -0.1, 0]} rotation={[-Math.PI/2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <FloorMaterial color="#8d6e63" roughness={0.9} />
    </mesh>

    {/* Main Stall */}
    <group position={[0, 0, -2]}>
        {/* Table */}
        <mesh position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[4, 1, 1.5]} />
            <meshStandardMaterial color="#a1887f" />
        </mesh>
        {/* Poles */}
        <mesh position={[-1.8, 1.5, 0.6]}><cylinderGeometry args={[0.05, 0.05, 3]} /><meshStandardMaterial color="#5d4037" /></mesh>
        <mesh position={[1.8, 1.5, 0.6]}><cylinderGeometry args={[0.05, 0.05, 3]} /><meshStandardMaterial color="#5d4037" /></mesh>
        {/* Awning */}
        <group position={[0, 2.5, 0.5]} rotation={[0.2, 0, 0]}>
            {Array.from({length: 5}).map((_, i) => (
                <mesh key={i} position={[i*0.8 - 1.6, 0, 0]}>
                    <cylinderGeometry args={[0.4, 0.4, 2, 3]} rotation={[Math.PI/2, 0, 0]} />
                    <meshStandardMaterial color={i % 2 === 0 ? "#c62828" : "#fff"} side={THREE.DoubleSide} />
                </mesh>
            ))}
        </group>
        
        {/* Produce */}
        <group position={[0, 1.1, 0.2]}>
            <mesh position={[-1, 0, 0]}>
                 <boxGeometry args={[0.8, 0.3, 0.8]} />
                 <meshStandardMaterial color="#d7ccc8" />
            </mesh>
            <mesh position={[0, 0, 0]}>
                 <boxGeometry args={[0.8, 0.3, 0.8]} />
                 <meshStandardMaterial color="#d7ccc8" />
            </mesh>
            <mesh position={[1, 0, 0]}>
                 <boxGeometry args={[0.8, 0.3, 0.8]} />
                 <meshStandardMaterial color="#d7ccc8" />
            </mesh>
            {/* Apples */}
            <mesh position={[-1, 0.2, 0]}><sphereGeometry args={[0.3]} /><meshStandardMaterial color="#d32f2f" /></mesh>
            {/* Oranges */}
             <mesh position={[0, 0.2, 0]}><sphereGeometry args={[0.3]} /><meshStandardMaterial color="#ff9800" /></mesh>
            {/* Greens */}
             <mesh position={[1, 0.2, 0]}><dodecahedronGeometry args={[0.3]} /><meshStandardMaterial color="#43a047" /></mesh>
        </group>
    </group>

    <Avatar isSpeaking={isAiSpeaking} position={[0, 0, -1.2]} />

    {/* Street Lamp */}
    <group position={[3, 0, 2]}>
        <mesh position={[0, 2, 0]}>
            <cylinderGeometry args={[0.1, 0.15, 4]} />
            <meshStandardMaterial color="#263238" />
        </mesh>
        <mesh position={[0, 4, 0]}>
            <sphereGeometry args={[0.4]} />
            <meshStandardMaterial color="#fff9c4" emissive="#fff9c4" emissiveIntensity={0.5} />
        </mesh>
        <pointLight position={[0, 4, 0]} intensity={1} distance={8} color="#fff9c4" />
    </group>

    {/* Vegetation */}
    <group position={[-4, 0, 1]}>
         <mesh position={[0, 0.5, 0]}>
             <cylinderGeometry args={[0.1, 0.1, 1]} />
             <meshStandardMaterial color="#5d4037" />
         </mesh>
         <mesh position={[0, 1.5, 0]}>
             <dodecahedronGeometry args={[1]} />
             <meshStandardMaterial color="#66bb6a" />
         </mesh>
    </group>
    <Sparkles count={40} scale={12} size={4} color="#fff" opacity={0.5} />
  </group>
);

export const Scene3D: React.FC<SceneProps> = ({ scenario, isAiSpeaking }) => {
  return (
    <Canvas shadows camera={{ position: [0, 2.5, 6], fov: 50 }}>
      <ResponsiveCamera />
      <color attach="background" args={['#121212']} />
      
      <SoftShadows size={10} focus={0.5} samples={10} />

      <group>
          {scenario === Scenario.CAFE && <RealisticCafe isAiSpeaking={isAiSpeaking} />}
          {scenario === Scenario.TRAIN_STATION && <RealisticStation isAiSpeaking={isAiSpeaking} />}
          {scenario === Scenario.MARKET && <RealisticMarket isAiSpeaking={isAiSpeaking} />}
      </group>

      <OrbitControls 
        enableZoom={true}
        minDistance={3}
        maxDistance={12}
        minPolarAngle={Math.PI / 4} 
        maxPolarAngle={Math.PI / 2}
        target={[0, 1, 0]}
        enablePan={false}
      />
    </Canvas>
  );
};