import React from "react";
import { Container } from "../container/container";
import './section.css';

export const Section = ({ children, className }) => {
    return(<section className={className}><Container>{ children }</Container></section>)
}