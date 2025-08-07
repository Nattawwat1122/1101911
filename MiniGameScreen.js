import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';

const images = [
  require('../assets/img1.png'),
  require('../assets/img2.png'),
  require('../assets/img3.png'),
  require('../assets/img4.png'),
  require('../assets/img5.png'),
  require('../assets/img6.png')
];

function shuffleArray(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

export default function MiniGameScreen() {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);

  useEffect(() => {
    const duplicated = images.concat(images); // 6 คู่
    const shuffled = shuffleArray(duplicated.map((img, index) => ({
      id: index,
      image: img
    })));
    setCards(shuffled);
  }, []);

  const handleFlip = (index) => {
    if (flipped.length === 2 || flipped.includes(index) || matched.includes(index)) return;
    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      const [first, second] = newFlipped;
      if (cards[first].image === cards[second].image) {
        setMatched([...matched, first, second]);
        setFlipped([]);
        if (matched.length + 2 === cards.length) {
          setTimeout(() => {
            Alert.alert("ชนะแล้ว!", "คุณจับคู่ครบทุกคู่แล้ว 🎉");
          }, 300);
        }
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧠 มินิเกมจับคู่ภาพ</Text>
      <View style={styles.grid}>
        {cards.map((card, index) => {
          const isFlipped = flipped.includes(index) || matched.includes(index);
          return (
            <TouchableOpacity
              key={index}
              style={styles.card}
              onPress={() => handleFlip(index)}
            >
              {isFlipped ? (
                <Image source={card.image} style={styles.image} />
              ) : (
                <View style={styles.cover} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingTop: 40, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: 'tomato' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: '90%' },
  card: { width: 80, height: 80, margin: 8 },
  image: { width: '100%', height: '100%', borderRadius: 10 },
  cover: {
    width: '100%', height: '100%',
    backgroundColor: '#ddd',
    borderRadius: 10
  }
});
