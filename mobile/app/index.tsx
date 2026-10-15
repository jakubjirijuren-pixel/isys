import { Link } from 'expo-router';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
const modules = [
  {title:'Objekty',detail:'Evidence spravovaných domů',href:'/buildings' as const},
  {title:'Kontroly',detail:'Připravujeme'},
  {title:'Klíče',detail:'Připravujeme'},
  {title:'Úkoly',detail:'Připravujeme'},
];
export default function Home() { return <ScrollView style={styles.page} contentContainerStyle={styles.content}><Text style={styles.title}>iSYS</Text><Text style={styles.subtitle}>Technická správa bytových domů</Text>{modules.map(m=><View key={m.title} style={styles.card}><Text style={styles.cardTitle}>{m.title}</Text><Text style={styles.detail}>{m.detail}</Text>{m.href&&<Link href={m.href} style={styles.link}>Otevřít →</Link>}</View>)}<Text style={styles.warning}>Vývojová ukázka. Nepoužívejte skutečná data družstva.</Text></ScrollView>; }
const styles=StyleSheet.create({page:{flex:1,backgroundColor:'#f3f6fa'},content:{padding:20,gap:14},title:{fontSize:34,fontWeight:'800',color:'#153a63'},subtitle:{fontSize:15,color:'#66788c',marginBottom:10},card:{backgroundColor:'white',padding:20,borderRadius:16,gap:8,borderWidth:1,borderColor:'#e4e9ef'},cardTitle:{fontSize:20,fontWeight:'700',color:'#153a63'},detail:{color:'#66788c'},link:{color:'#1769aa',fontWeight:'700',marginTop:6},warning:{fontSize:12,color:'#9a5b1e',marginTop:12}});
