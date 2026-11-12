package com.example.inventory.controller;
import com.example.inventory.dto.TransactionRequest;
import com.example.inventory.entity.InventoryTransaction;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import com.example.inventory.service.TransactionService;
@RestController @RequestMapping("/sync")
public class SyncController {
 private final TransactionService service;
 public SyncController(TransactionService s){service=s;}
 @PostMapping public List<InventoryTransaction> sync(@Valid @RequestBody List<TransactionRequest> requests){
   List<InventoryTransaction> out=new ArrayList<>();
   for(var r:requests) out.add(service.process(r));
   return out;
 }
 @GetMapping("/pending") public Map<String,Object> pending(){return Map.of("pending",0,"message","Pending transactions are maintained by the browser offline queue.");}
}
